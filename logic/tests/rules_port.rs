// This imports the real shared rules, not a hand-maintained copy.
use hatchmind_logic::rules::*;
use sha2::{Digest, Sha256};
#[test]
fn egg_to_baby() {
    assert_eq!(next_stage(0, 1, 103, 100, 3), Ok(()));
}
#[test]
fn baby_to_growth() {
    assert_eq!(next_stage(1, 2, 106, 103, 3), Ok(()));
}
#[test]
fn growth_to_evolved() {
    assert_eq!(next_stage(2, 3, 109, 106, 3), Ok(()));
}
#[test]
fn cannot_skip() {
    assert_eq!(next_stage(0, 2, 999, 0, 3), Err(RuleError::InvalidStage));
}
#[test]
fn cannot_reverse() {
    assert_eq!(next_stage(2, 1, 999, 0, 3), Err(RuleError::InvalidStage));
}
#[test]
fn cannot_repeat() {
    assert_eq!(next_stage(1, 1, 999, 0, 3), Err(RuleError::InvalidStage));
}
#[test]
fn final_stage_terminal() {
    assert_eq!(next_stage(3, 4, 999, 0, 3), Err(RuleError::InvalidStage));
}
#[test]
fn wait_each_stage() {
    assert_eq!(next_stage(1, 2, 105, 103, 3), Err(RuleError::TooEarly));
}
#[test]
fn negative_clock_delta_rejected() {
    assert_eq!(next_stage(0, 1, 99, 100, 3), Err(RuleError::TooEarly));
}
#[test]
fn production_wait_30_days() {
    assert_eq!(PRODUCTION_STAGE_SECONDS, 2_592_000);
    assert_eq!(
        next_stage(0, 1, 2_591_999, 0, PRODUCTION_STAGE_SECONDS),
        Err(RuleError::TooEarly)
    );
    assert_eq!(
        next_stage(0, 1, 2_592_000, 0, PRODUCTION_STAGE_SECONDS),
        Ok(())
    );
}
#[test]
fn deadline_adds_ttl() {
    assert_eq!(deadline(100, 3), Ok(103));
}
#[test]
fn deadline_rejects_zero_negative_or_large() {
    for ttl in [0, -1, MAX_TTL + 1] {
        assert_eq!(deadline(100, ttl), Err(RuleError::InvalidTtl));
    }
}
#[test]
fn deadline_overflow_rejected() {
    assert_eq!(deadline(i64::MAX, 1), Err(RuleError::InvalidTtl));
}
#[test]
fn expiry_boundary_inclusive() {
    assert_eq!(active(102, 103), Ok(()));
    assert_eq!(active(103, 103), Err(RuleError::Expired));
    assert_eq!(active(104, 103), Err(RuleError::Expired));
}
#[test]
fn eggs_and_babies_cannot_breed() {
    for stage in [0, 1, 4, 255] {
        assert_eq!(breed_ready(stage, 100, 0, 3), Err(RuleError::InvalidStage));
    }
}
#[test]
fn mature_pets_can_breed() {
    for stage in [2, 3] {
        assert_eq!(breed_ready(stage, 100, 0, 3), Ok(()));
    }
}
#[test]
fn cooldown_boundary() {
    assert_eq!(breed_ready(2, 102, 100, 3), Err(RuleError::Cooldown));
    assert_eq!(breed_ready(2, 103, 100, 3), Ok(()));
}
#[test]
fn seed_matches_exact_domain_and_little_endian() {
    let a = [1u8; 32];
    let b = [2u8; 32];
    let n = 0x0807060504030201u64;
    let mut bytes = b"HM-BREED-v1".to_vec();
    bytes.extend(a);
    bytes.extend(b);
    bytes.extend([1, 2, 3, 4, 5, 6, 7, 8]);
    let expected: [u8; 32] = Sha256::digest(bytes).into();
    assert_eq!(breed_seed(&a, &b, n), expected);
}
#[test]
fn seed_is_ordered_and_nonce_sensitive() {
    let a = [1; 32];
    let b = [2; 32];
    assert_ne!(breed_seed(&a, &b, 1), breed_seed(&b, &a, 1));
    assert_ne!(breed_seed(&a, &b, 1), breed_seed(&a, &b, 2));
    assert_eq!(breed_seed(&a, &b, 1), breed_seed(&a, &b, 1));
}
#[test]
fn each_homologous_organ_comes_from_corresponding_parent() {
    for nonce in 0..100 {
        let child = inherit([0; 7], [3; 7], breed_seed(&[1; 32], &[2; 32], nonce));
        assert!(child.iter().all(|x| *x == 0 || *x == 3));
    }
    assert_eq!(
        inherit([0, 1, 2, 3, 0, 1, 2], [3, 2, 1, 0, 3, 2, 1], [0; 32]),
        [0, 1, 2, 3, 0, 1, 2]
    );
    assert_eq!(inherit([0; 7], [3; 7], [1; 32]), [3; 7]);
}
#[test]
fn identical_parents_preserve_genotype() {
    let g = [0, 1, 2, 3, 2, 1, 0];
    for nonce in 0..100 {
        assert_eq!(inherit(g, g, breed_seed(&[1; 32], &[2; 32], nonce)), g);
    }
}
