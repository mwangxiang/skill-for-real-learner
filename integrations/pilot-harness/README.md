# Pilot Harness alpha.23 integration

Visual Learner alpha.23 uses ordinary Pilot slots for its UI, but resizable
`shell.right-sidebar` geometry requires one small Pilot host companion patch.

## Frozen identities

- Upstream repository: `https://github.com/op7418/pilot-harness`
- Base commit: `d1fa9c15fc00c05ea6931aafd724554ca34d5a6d`
- Local runtime commit used for validation: `059c09cd0`
- Patch: `patches/0001-feat-ui-layout-resize-docked-workspace-sidebar.patch`
- Patch SHA-256: `1BD722CBEAD4D23A4A3641B013A43FC13F14D93C4ED28E694625E54938CDB1FB`

The patch adds a typed `setRightSidebar` store action, public
`setRightSidebarWidth` service method, 240–560px clamp, an accessible
right-sidebar separator, pointer drag, and 16/64px keyboard steps. It does not
change Worktree or Visual Learner business state.

## Apply to a clean Pilot checkout

```powershell
git switch --detach d1fa9c15fc00c05ea6931aafd724554ca34d5a6d
git am E:\path\to\plugin-repo\integrations\pilot-harness\patches\0001-feat-ui-layout-resize-docked-workspace-sidebar.patch
```

Do not push the local integration branch to the third-party remote without the
Pilot maintainer's explicit permission. The separate local test commit that
pins the desktop E2E renderer locale is not required at runtime.

## Verify

```powershell
node scripts/verify-pilot-abi.mjs --pilot-root D:\path\to\pilot-harness
```

The verifier accepts either the clean upstream ABI or the exact alpha.23
integration hashes and fails for any third state.
