# DSH Visual Learner

> ABI probe: `0.0.1-alpha.0`

This package is the first prebuilt Host + Client Bundle probe for the official
DSH `0.1.1-rc.2` Web Profile. It is not yet the complete learning product.

The Host registers one loopback-only status endpoint. The Client uses the
official `conversation` single slot with priority `-1`, proves that the Host
is reachable, and renders a bilingual Simplified Chinese / English probe.

The probe intentionally does not register the unstable root slot, scan a
Vault, store credentials, or write learning artifacts.
