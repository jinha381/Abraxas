use hatchmind_logic::rules::*;
use proptest::prelude::*;

proptest! {
    #![proptest_config(ProptestConfig::with_cases(512))]
    #[test]
    fn prop_next_stage(current in any::<u8>(), requested in any::<u8>(), now in any::<i64>(), changed in any::<i64>(), interval in any::<i64>()) {
        if next_stage(current, requested, now, changed, interval).is_ok() {
            prop_assert!(current < 3);
            prop_assert_eq!(requested, current + 1);
        }
        // 임의 u8에서 성공이 희소하므로, 같은 표본에서 유효한 순차 성공도 검사합니다.
        let stage = current % 3;
        prop_assert_eq!(next_stage(stage, stage + 1, 3, 0, 3), Ok(()));
    }
    #[test]
    fn prop_deadline(now in any::<i64>(), arbitrary_ttl in any::<i64>(), valid_ttl in 1i64..=86400) {
        let expected = if (1..=86400).contains(&arbitrary_ttl) { now.checked_add(arbitrary_ttl).ok_or(RuleError::InvalidTtl) } else { Err(RuleError::InvalidTtl) };
        prop_assert_eq!(deadline(now, arbitrary_ttl), expected);
        prop_assert_eq!(deadline(now, valid_ttl), now.checked_add(valid_ttl).ok_or(RuleError::InvalidTtl));
        prop_assert_eq!(deadline(i64::MAX, valid_ttl), Err(RuleError::InvalidTtl));
    }
    #[test]
    fn prop_inherit(a in any::<[u8; 7]>(), b in any::<[u8; 7]>(), seed in any::<[u8; 32]>()) {
        let child = inherit(a, b, seed);
        for i in 0..7 { prop_assert!(child[i] == a[i] || child[i] == b[i]); }
        prop_assert_eq!(inherit(a, a, seed), a);
    }
    #[test]
    fn prop_breed_seed_adjacent_nonce(a in any::<[u8; 32]>(), b in any::<[u8; 32]>(), nonce in 0u64..u64::MAX) {
        // 충돌이 없다는 수학적 증명은 아니며 인접 nonce의 표본 검사입니다.
        prop_assert_ne!(breed_seed(&a, &b, nonce), breed_seed(&a, &b, nonce + 1));
    }
}
