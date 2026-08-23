# DSH Visual Learner

> ABI + embedded Skill provider probe: `0.0.2-alpha.0`

This package is the first prebuilt Host + Client Bundle probe for the official
DSH `0.1.1-rc.2` Web Profile. It is not yet the complete learning product.

The package carries the ten locked Skills. The Host registers them through the
official filesystem provider and exposes one loopback-only status endpoint.
The Client uses the
official `conversation` single slot with priority `-1`, proves that the Host
is reachable, and renders a bilingual Simplified Chinese / English probe.

The probe intentionally does not register the unstable root slot, scan a
Vault, store credentials, or write learning artifacts. A live model learning
turn remains a separate credential-gated test.
