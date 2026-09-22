# Changelog

## Unreleased

### Changed

- Upgrade the desktop toolchain to Electrobun 2.0.1 and its paired Hutch build
  workflow while retaining Bun as the application main-process runtime.
- Project Electrobun's generated SDK before development, typechecking, and
  builds, and share its aliases with TypeScript and Vite.
- Limit macOS releases to Apple Silicon while Electrobun 2.x has no macOS x64
  core, update artifact naming for Electrobun 2, and move release builds to the
  `macos-26` runner.
- Replace the legacy PNG iconset with `apps/desktop/AppIcon.icon`; packaging now
  uses Xcode's `actool` to generate both `Assets.car` and an `.icns` fallback.
- Update the bilingual setup, rebranding, feature, and contributor documentation
  for the Electrobun 2 and Icon Composer requirements.

### Removed

- Remove the Electrobun 1-only macOS x64 header-padding workaround and its
  release hooks.
