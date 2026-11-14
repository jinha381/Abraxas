pub const PRODUCTION_STAGE_SECONDS: i64 = 30 * 24 * 60 * 60;
pub const TEST_STAGE_SECONDS: i64 = 3;
pub const MAX_TTL: i64 = 24 * 60 * 60;
pub const BREED_DOMAIN: &[u8] = b"HM-BREED-v1";
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RuleError {
    InvalidStage,
    TooEarly,
    Expired,
    InvalidTtl,
    Cooldown,
}
pub fn next_stage(
    current: u8,
    requested: u8,
    now: i64,
    changed_at: i64,
    interval: i64,
) -> Result<(), RuleError> {
    if current >= 3 || requested != current + 1 {
        return Err(RuleError::InvalidStage);
    }
    if interval <= 0 || now.saturating_sub(changed_at) < interval {
        return Err(RuleError::TooEarly);
    }
    Ok(())
}
pub fn deadline(now: i64, ttl: i64) -> Result<i64, RuleError> {
    if !(1..=MAX_TTL).contains(&ttl) {
        return Err(RuleError::InvalidTtl);
    }
    now.checked_add(ttl).ok_or(RuleError::InvalidTtl)
}
pub fn active(now: i64, expires: i64) -> Result<(), RuleError> {
    if now >= expires {
        Err(RuleError::Expired)
    } else {
        Ok(())
    }
}
pub fn breed_ready(stage: u8, now: i64, last_bred: i64, interval: i64) -> Result<(), RuleError> {
    if !(2..=3).contains(&stage) {
        return Err(RuleError::InvalidStage);
    }
    if last_bred != 0 && now.saturating_sub(last_bred) < interval {
        return Err(RuleError::Cooldown);
    }
    Ok(())
}
pub fn breed_seed(a: &[u8; 32], b: &[u8; 32], nonce: u64) -> [u8; 32] {
    use sha2::{Digest, Sha256};
    let mut h = Sha256::new();
    h.update(BREED_DOMAIN);
    h.update(a);
    h.update(b);
    h.update(nonce.to_le_bytes());
    h.finalize().into()
}
// Skeleton + six homologous organs. Each complete organ comes from one parent.
pub fn inherit(a: [u8; 7], b: [u8; 7], seed: [u8; 32]) -> [u8; 7] {
    let mut child = [0; 7];
    for i in 0..7 {
        child[i] = if seed[i] & 1 == 0 { a[i] } else { b[i] };
    }
    child
}
