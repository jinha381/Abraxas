use anchor_lang::prelude::*;
use mpl_core::{
    accounts::BaseAssetV1,
    instructions::{CreateV1CpiBuilder, TransferV1CpiBuilder},
    types::{DataState, Key as CoreKey},
};
pub mod rules;
declare_id!("CaAnbZJBkbZSGFgpi6W1oxxeuKeFFz9PvZJxGoTMxmRy");

#[program]
pub mod hatchmind {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>, founders: [Pubkey; 4]) -> Result<()> {
        for i in 0..4 {
            require!(founders[i] != Pubkey::default(), HatchError::InvalidFounder);
            for j in 0..i {
                require!(founders[i] != founders[j], HatchError::InvalidFounder);
            }
        }
        let c = &mut ctx.accounts.config;
        c.authority = ctx.accounts.authority.key();
        c.founders = founders;
        c.registered = 0;
        c.bump = ctx.bumps.config;
        c.stage_seconds = if cfg!(feature = "local-testing") {
            rules::TEST_STAGE_SECONDS
        } else {
            rules::PRODUCTION_STAGE_SECONDS
        };
        Ok(())
    }
    pub fn register_pet(ctx: Context<RegisterPet>, species: u8) -> Result<()> {
        require!(species < 4, HatchError::InvalidFounder);
        let c = &ctx.accounts.config;
        require_keys_eq!(
            c.founders[species as usize],
            ctx.accounts.owner.key(),
            HatchError::Unauthorized
        );
        require!(
            c.registered & (1 << species) == 0,
            HatchError::AlreadyRegistered
        );
        let bump = [c.bump];
        let signer: &[&[u8]] = &[b"config", &bump];
        mint_core(
            &ctx.accounts.core_program,
            &ctx.accounts.asset,
            &ctx.accounts.owner.to_account_info(),
            &ctx.accounts.owner.to_account_info(),
            &c.to_account_info(),
            &ctx.accounts.system_program.to_account_info(),
            signer,
        )?;
        let p = &mut ctx.accounts.pet;
        p.asset = ctx.accounts.asset.key();
        p.genome = [species; 7];
        p.stage = 0;
        p.changed_at = Clock::get()?.unix_timestamp;
        ctx.accounts.config.registered |= 1 << species;
        Ok(())
    }
    pub fn record_evolution(ctx: Context<Evolve>, requested: u8) -> Result<()> {
        require_owner(&ctx.accounts.asset, ctx.accounts.owner.key())?;
        let now = Clock::get()?.unix_timestamp;
        let p = &mut ctx.accounts.pet;
        map_rule(rules::next_stage(
            p.stage,
            requested,
            now,
            p.changed_at,
            ctx.accounts.config.stage_seconds,
        ))?;
        p.stage = requested;
        p.changed_at = now;
        Ok(())
    }
    pub fn request_breeding(ctx: Context<RequestBreeding>, nonce: u64, ttl: i64) -> Result<()> {
        require_keys_neq!(
            ctx.accounts.asset_a.key(),
            ctx.accounts.asset_b.key(),
            HatchError::SamePet
        );
        let a = core_owner(&ctx.accounts.asset_a)?;
        let b = core_owner(&ctx.accounts.asset_b)?;
        require_keys_eq!(a, ctx.accounts.requester.key(), HatchError::Unauthorized);
        let now = Clock::get()?.unix_timestamp;
        let interval = ctx.accounts.config.stage_seconds;
        map_rule(rules::breed_ready(
            ctx.accounts.pet_a.stage,
            now,
            ctx.accounts.pet_a.last_bred,
            interval,
        ))?;
        map_rule(rules::breed_ready(
            ctx.accounts.pet_b.stage,
            now,
            ctx.accounts.pet_b.last_bred,
            interval,
        ))?;
        let r = &mut ctx.accounts.request;
        r.asset_a = ctx.accounts.asset_a.key();
        r.asset_b = ctx.accounts.asset_b.key();
        r.owner_a = a;
        r.owner_b = b;
        r.nonce = nonce;
        r.consent_a = true;
        r.consent_b = a == b;
        r.expires = map_rule(rules::deadline(now, ttl))?;
        r.consumed = false;
        r.cancelled = false;
        Ok(())
    }
    pub fn approve_breeding(ctx: Context<ApproveBreeding>) -> Result<()> {
        let r = &mut ctx.accounts.request;
        check_request(r)?;
        require_keys_eq!(
            core_owner(&ctx.accounts.asset_a)?,
            r.owner_a,
            HatchError::OwnerChanged
        );
        require_keys_eq!(
            core_owner(&ctx.accounts.asset_b)?,
            r.owner_b,
            HatchError::OwnerChanged
        );
        require_keys_eq!(
            ctx.accounts.owner.key(),
            r.owner_b,
            HatchError::Unauthorized
        );
        r.consent_b = true;
        Ok(())
    }
    pub fn cancel_breeding(ctx: Context<CancelBreeding>) -> Result<()> {
        let r = &mut ctx.accounts.request;
        require!(!r.consumed, HatchError::AlreadyConsumed);
        require!(
            ctx.accounts.owner.key() == r.owner_a || ctx.accounts.owner.key() == r.owner_b,
            HatchError::Unauthorized
        );
        r.cancelled = true;
        Ok(())
    }
    pub fn execute_breeding(ctx: Context<ExecuteBreeding>) -> Result<()> {
        let r = &ctx.accounts.request;
        check_request(r)?;
        require!(r.consent_a && r.consent_b, HatchError::MissingConsent);
        require_keys_eq!(
            core_owner(&ctx.accounts.asset_a)?,
            r.owner_a,
            HatchError::OwnerChanged
        );
        require_keys_eq!(
            core_owner(&ctx.accounts.asset_b)?,
            r.owner_b,
            HatchError::OwnerChanged
        );
        require_keys_eq!(
            ctx.accounts.child_owner.key(),
            r.owner_a,
            HatchError::Unauthorized
        );
        let now = Clock::get()?.unix_timestamp;
        let interval = ctx.accounts.config.stage_seconds;
        map_rule(rules::breed_ready(
            ctx.accounts.pet_a.stage,
            now,
            ctx.accounts.pet_a.last_bred,
            interval,
        ))?;
        map_rule(rules::breed_ready(
            ctx.accounts.pet_b.stage,
            now,
            ctx.accounts.pet_b.last_bred,
            interval,
        ))?;
        let seed = rules::breed_seed(&r.asset_a.to_bytes(), &r.asset_b.to_bytes(), r.nonce);
        let c = &ctx.accounts.config;
        let bump = [c.bump];
        mint_core(
            &ctx.accounts.core_program,
            &ctx.accounts.child_asset,
            &ctx.accounts.payer.to_account_info(),
            &ctx.accounts.child_owner,
            &c.to_account_info(),
            &ctx.accounts.system_program.to_account_info(),
            &[b"config", &bump],
        )?;
        let child = &mut ctx.accounts.child;
        child.asset = ctx.accounts.child_asset.key();
        child.parent_a = r.asset_a;
        child.parent_b = r.asset_b;
        child.seed = seed;
        child.genome = rules::inherit(ctx.accounts.pet_a.genome, ctx.accounts.pet_b.genome, seed);
        child.stage = 0;
        child.changed_at = now;
        ctx.accounts.pet_a.last_bred = now;
        ctx.accounts.pet_b.last_bred = now;
        ctx.accounts.request.consumed = true;
        emit!(BirthEvent {
            child: child.asset,
            parent_a: child.parent_a,
            parent_b: child.parent_b,
            seed
        });
        Ok(())
    }
    pub fn create_gift_claim(
        ctx: Context<CreateGift>,
        nonce: u64,
        secret_hash: [u8; 32],
        ttl: i64,
    ) -> Result<()> {
        require_owner(&ctx.accounts.asset, ctx.accounts.giver.key())?;
        require!(ctx.accounts.pet.stage == 0, HatchError::InvalidStage);
        require!(secret_hash != [0; 32], HatchError::BadSecret);
        let g = &mut ctx.accounts.gift;
        g.asset = ctx.accounts.asset.key();
        g.giver = ctx.accounts.giver.key();
        g.nonce = nonce;
        g.secret_hash = secret_hash;
        g.expires = map_rule(rules::deadline(Clock::get()?.unix_timestamp, ttl))?;
        g.claimed = false;
        g.reclaimed = false;
        g.bump = ctx.bumps.gift;
        transfer_core(
            &ctx.accounts.core_program,
            &ctx.accounts.asset,
            &ctx.accounts.giver.to_account_info(),
            &ctx.accounts.giver.to_account_info(),
            &g.to_account_info(),
            &ctx.accounts.system_program.to_account_info(),
            &[],
        )?;
        Ok(())
    }
    pub fn claim_egg(ctx: Context<ClaimGift>, secret: [u8; 32]) -> Result<()> {
        let g = &ctx.accounts.gift;
        require!(!g.claimed && !g.reclaimed, HatchError::AlreadyClaimed);
        map_rule(rules::active(Clock::get()?.unix_timestamp, g.expires))?;
        require!(
            anchor_lang::solana_program::hash::hash(&secret).to_bytes() == g.secret_hash,
            HatchError::BadSecret
        );
        require_owner(&ctx.accounts.asset, g.key())?;
        let nonce = g.nonce.to_le_bytes();
        let bump = [g.bump];
        transfer_core(
            &ctx.accounts.core_program,
            &ctx.accounts.asset,
            &ctx.accounts.recipient.to_account_info(),
            &g.to_account_info(),
            &ctx.accounts.recipient.to_account_info(),
            &ctx.accounts.system_program.to_account_info(),
            &[b"gift", g.asset.as_ref(), &nonce, &bump],
        )?;
        ctx.accounts.gift.claimed = true;
        Ok(())
    }
    pub fn reclaim_gift(ctx: Context<ReclaimGift>) -> Result<()> {
        let g = &ctx.accounts.gift;
        require!(!g.claimed && !g.reclaimed, HatchError::AlreadyClaimed);
        require_keys_eq!(ctx.accounts.giver.key(), g.giver, HatchError::Unauthorized);
        require!(
            Clock::get()?.unix_timestamp >= g.expires,
            HatchError::NotExpired
        );
        require_owner(&ctx.accounts.asset, g.key())?;
        let nonce = g.nonce.to_le_bytes();
        let bump = [g.bump];
        transfer_core(
            &ctx.accounts.core_program,
            &ctx.accounts.asset,
            &ctx.accounts.giver.to_account_info(),
            &g.to_account_info(),
            &ctx.accounts.giver.to_account_info(),
            &ctx.accounts.system_program.to_account_info(),
            &[b"gift", g.asset.as_ref(), &nonce, &bump],
        )?;
        ctx.accounts.gift.reclaimed = true;
        Ok(())
    }
}

fn core_owner(asset: &AccountInfo) -> Result<Pubkey> {
    require_keys_eq!(*asset.owner, mpl_core::ID, HatchError::InvalidCoreAsset);
    let data = asset.try_borrow_data()?;
    let parsed =
        BaseAssetV1::from_bytes(&data).map_err(|_| error!(HatchError::InvalidCoreAsset))?;
    require!(parsed.key == CoreKey::AssetV1, HatchError::InvalidCoreAsset);
    Ok(parsed.owner)
}
fn require_owner(asset: &AccountInfo, owner: Pubkey) -> Result<()> {
    require_keys_eq!(core_owner(asset)?, owner, HatchError::Unauthorized);
    Ok(())
}
fn check_request(r: &BreedingRequest) -> Result<()> {
    require!(!r.consumed, HatchError::AlreadyConsumed);
    require!(!r.cancelled, HatchError::Cancelled);
    map_rule(rules::active(Clock::get()?.unix_timestamp, r.expires))
}
fn map_rule<T>(r: std::result::Result<T, rules::RuleError>) -> Result<T> {
    r.map_err(|e| match e {
        rules::RuleError::InvalidStage => error!(HatchError::InvalidStage),
        rules::RuleError::TooEarly => error!(HatchError::TooEarly),
        rules::RuleError::Expired => error!(HatchError::Expired),
        rules::RuleError::InvalidTtl => error!(HatchError::InvalidTtl),
        rules::RuleError::Cooldown => error!(HatchError::Cooldown),
    })
}
fn mint_core<'info>(
    core: &AccountInfo<'info>,
    asset: &AccountInfo<'info>,
    payer: &AccountInfo<'info>,
    owner: &AccountInfo<'info>,
    authority: &AccountInfo<'info>,
    system: &AccountInfo<'info>,
    seeds: &[&[u8]],
) -> Result<()> {
    CreateV1CpiBuilder::new(core)
        .asset(asset)
        .payer(payer)
        .authority(Some(authority))
        .owner(Some(owner))
        .update_authority(Some(authority))
        .system_program(system)
        .data_state(DataState::AccountState)
        .name("HatchMind".to_string())
        .uri("https://example.invalid/hatchmind/local-test.json".to_string())
        .invoke_signed(&[seeds])?;
    Ok(())
}
fn transfer_core<'info>(
    core: &AccountInfo<'info>,
    asset: &AccountInfo<'info>,
    payer: &AccountInfo<'info>,
    authority: &AccountInfo<'info>,
    new_owner: &AccountInfo<'info>,
    system: &AccountInfo<'info>,
    seeds: &[&[u8]],
) -> Result<()> {
    let mut b = TransferV1CpiBuilder::new(core);
    b.asset(asset)
        .payer(payer)
        .authority(Some(authority))
        .new_owner(new_owner)
        .system_program(Some(system));
    if seeds.is_empty() {
        b.invoke()?;
    } else {
        b.invoke_signed(&[seeds])?;
    }
    Ok(())
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = 8 + Config::INIT_SPACE, seeds = [b"config"], bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
#[instruction(species: u8)]
pub struct RegisterPet<'info> {
    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(init, payer = owner, space = 8 + PetRecord::INIT_SPACE, seeds = [b"pet", asset.key().as_ref()], bump)]
    pub pet: Box<Account<'info, PetRecord>>,
    /// CHECK: New Core asset signer; the Core CPI initializes and owns it.
    #[account(mut)]
    pub asset: Signer<'info>,
    #[account(mut)]
    pub owner: Signer<'info>,
    /// CHECK: Fixed executable Core program.
    #[account(address = mpl_core::ID, executable)]
    pub core_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct Evolve<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(mut, seeds = [b"pet", asset.key().as_ref()], bump, has_one = asset)]
    pub pet: Box<Account<'info, PetRecord>>,
    /// CHECK: Owner and AssetV1 discriminator are verified by core_owner.
    pub asset: UncheckedAccount<'info>,
    pub owner: Signer<'info>,
}
#[derive(Accounts)]
#[instruction(nonce: u64)]
pub struct RequestBreeding<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(seeds = [b"pet", asset_a.key().as_ref()], bump, constraint = pet_a.asset == asset_a.key())]
    pub pet_a: Box<Account<'info, PetRecord>>,
    #[account(seeds = [b"pet", asset_b.key().as_ref()], bump, constraint = pet_b.asset == asset_b.key())]
    pub pet_b: Box<Account<'info, PetRecord>>,
    /// CHECK: Verified as a Core asset in handler.
    pub asset_a: UncheckedAccount<'info>,
    /// CHECK: Verified as a Core asset in handler.
    pub asset_b: UncheckedAccount<'info>,
    #[account(init, payer = requester, space = 8 + BreedingRequest::INIT_SPACE,
        seeds = [b"breed", asset_a.key().as_ref(), asset_b.key().as_ref(), &nonce.to_le_bytes()], bump)]
    pub request: Box<Account<'info, BreedingRequest>>,
    #[account(mut)]
    pub requester: Signer<'info>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct ApproveBreeding<'info> {
    #[account(mut, seeds = [b"breed", request.asset_a.as_ref(), request.asset_b.as_ref(), &request.nonce.to_le_bytes()], bump)]
    pub request: Box<Account<'info, BreedingRequest>>,
    /// CHECK: Bound to request, Core ownership re-read in handler.
    #[account(address = request.asset_a)]
    pub asset_a: UncheckedAccount<'info>,
    /// CHECK: Bound to request, Core ownership re-read in handler.
    #[account(address = request.asset_b)]
    pub asset_b: UncheckedAccount<'info>,
    pub owner: Signer<'info>,
}
#[derive(Accounts)]
pub struct CancelBreeding<'info> {
    #[account(mut, seeds = [b"breed", request.asset_a.as_ref(), request.asset_b.as_ref(), &request.nonce.to_le_bytes()], bump)]
    pub request: Box<Account<'info, BreedingRequest>>,
    pub owner: Signer<'info>,
}
#[derive(Accounts)]
pub struct ExecuteBreeding<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(mut, seeds = [b"breed", request.asset_a.as_ref(), request.asset_b.as_ref(), &request.nonce.to_le_bytes()], bump)]
    pub request: Box<Account<'info, BreedingRequest>>,
    #[account(mut, seeds = [b"pet", asset_a.key().as_ref()], bump, constraint = pet_a.asset == asset_a.key())]
    pub pet_a: Box<Account<'info, PetRecord>>,
    #[account(mut, seeds = [b"pet", asset_b.key().as_ref()], bump, constraint = pet_b.asset == asset_b.key())]
    pub pet_b: Box<Account<'info, PetRecord>>,
    /// CHECK: Bound to request; Core owner verified in handler.
    #[account(address = request.asset_a)]
    pub asset_a: UncheckedAccount<'info>,
    /// CHECK: Bound to request; Core owner verified in handler.
    #[account(address = request.asset_b)]
    pub asset_b: UncheckedAccount<'info>,
    #[account(init, payer = payer, space = 8 + PetRecord::INIT_SPACE, seeds = [b"pet", child_asset.key().as_ref()], bump)]
    pub child: Box<Account<'info, PetRecord>>,
    /// CHECK: Core CPI creates this new asset with its transaction signature.
    #[account(mut)]
    pub child_asset: Signer<'info>,
    /// CHECK: Must equal request owner A, checked before CPI.
    pub child_owner: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: Fixed executable Core program.
    #[account(address = mpl_core::ID, executable)]
    pub core_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
#[instruction(nonce: u64)]
pub struct CreateGift<'info> {
    #[account(seeds = [b"pet", asset.key().as_ref()], bump, has_one = asset)]
    pub pet: Box<Account<'info, PetRecord>>,
    /// CHECK: Core owner verified; CPI transfers the actual asset.
    #[account(mut)]
    pub asset: UncheckedAccount<'info>,
    #[account(init, payer = giver, space = 8 + GiftClaim::INIT_SPACE,
        seeds = [b"gift", asset.key().as_ref(), &nonce.to_le_bytes()], bump)]
    pub gift: Box<Account<'info, GiftClaim>>,
    #[account(mut)]
    pub giver: Signer<'info>,
    /// CHECK: Fixed executable Core program.
    #[account(address = mpl_core::ID, executable)]
    pub core_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct ClaimGift<'info> {
    #[account(mut, seeds = [b"gift", gift.asset.as_ref(), &gift.nonce.to_le_bytes()], bump = gift.bump)]
    pub gift: Box<Account<'info, GiftClaim>>,
    /// CHECK: Bound to gift and escrow owner verified in handler.
    #[account(mut, address = gift.asset)]
    pub asset: UncheckedAccount<'info>,
    #[account(mut)]
    pub recipient: Signer<'info>,
    /// CHECK: Fixed executable Core program.
    #[account(address = mpl_core::ID, executable)]
    pub core_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct ReclaimGift<'info> {
    #[account(mut, seeds = [b"gift", gift.asset.as_ref(), &gift.nonce.to_le_bytes()], bump = gift.bump)]
    pub gift: Box<Account<'info, GiftClaim>>,
    /// CHECK: Bound to gift and escrow owner verified in handler.
    #[account(mut, address = gift.asset)]
    pub asset: UncheckedAccount<'info>,
    #[account(mut)]
    pub giver: Signer<'info>,
    /// CHECK: Fixed executable Core program.
    #[account(address = mpl_core::ID, executable)]
    pub core_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}
#[account]
#[derive(InitSpace)]
pub struct Config {
    pub authority: Pubkey,
    pub founders: [Pubkey; 4],
    pub registered: u8,
    pub bump: u8,
    pub stage_seconds: i64,
}
#[account]
#[derive(InitSpace)]
pub struct PetRecord {
    pub asset: Pubkey,
    pub parent_a: Pubkey,
    pub parent_b: Pubkey,
    pub seed: [u8; 32],
    pub genome: [u8; 7],
    pub stage: u8,
    pub changed_at: i64,
    pub last_bred: i64,
}
#[account]
#[derive(InitSpace)]
pub struct BreedingRequest {
    pub asset_a: Pubkey,
    pub asset_b: Pubkey,
    pub owner_a: Pubkey,
    pub owner_b: Pubkey,
    pub nonce: u64,
    pub expires: i64,
    pub consent_a: bool,
    pub consent_b: bool,
    pub consumed: bool,
    pub cancelled: bool,
}
#[account]
#[derive(InitSpace)]
pub struct GiftClaim {
    pub asset: Pubkey,
    pub giver: Pubkey,
    pub nonce: u64,
    pub secret_hash: [u8; 32],
    pub expires: i64,
    pub claimed: bool,
    pub reclaimed: bool,
    pub bump: u8,
}
#[event]
pub struct BirthEvent {
    pub child: Pubkey,
    pub parent_a: Pubkey,
    pub parent_b: Pubkey,
    pub seed: [u8; 32],
}
#[error_code]
pub enum HatchError {
    #[msg("Signer is not the current Core owner or authorized participant")]
    Unauthorized,
    #[msg("Both owners must consent")]
    MissingConsent,
    #[msg("A pet cannot breed with itself")]
    SamePet,
    #[msg("Current Core ownership differs from the consent snapshot")]
    OwnerChanged,
    #[msg("Breeding request already executed")]
    AlreadyConsumed,
    #[msg("Invalid growth step or breeding/gift stage")]
    InvalidStage,
    #[msg("Wait stage_seconds before each growth step")]
    TooEarly,
    #[msg("Wrong claim secret")]
    BadSecret,
    #[msg("Gift already claimed or reclaimed")]
    AlreadyClaimed,
    #[msg("Gift is not yet expired")]
    NotExpired,
    #[msg("Breeding request was cancelled")]
    Cancelled,
    #[msg("Breeding cooldown has not elapsed")]
    Cooldown,
    #[msg("Request or gift has expired")]
    Expired,
    #[msg("TTL must be between 1 and 86400 seconds")]
    InvalidTtl,
    #[msg("Invalid genesis wallet or species")]
    InvalidFounder,
    #[msg("Genesis species already registered")]
    AlreadyRegistered,
    #[msg("Account is not a valid Metaplex Core AssetV1")]
    InvalidCoreAsset,
}
