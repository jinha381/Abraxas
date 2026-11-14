# anchor-syn 0.30.1 compatibility patch

Source: crates.io anchor-syn 0.30.1 (official Anchor source), Apache-2.0, LICENSE retained.
All source files are copied unchanged except src/idl/defined.rs line 499:

Before:
```rust
let source_path = proc_macro2::Span::call_site().source_file().path();
```

After:
```rust
let source_path = proc_macro2::Span::call_site().local_file().expect("source file path should exist");
```

Recent proc-macro2 removed source_file; local_file gives the same local source PathBuf for IDL type resolution. This patch affects IDL generation only. It does not skip IDL lint or modify contract checks. The workspace [patch.crates-io] keeps it reproducible without editing the global Cargo cache.
