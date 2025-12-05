

# Changelog

All notable changes to this project will be documented in this file.

## [1.3.3] - 2024-05-24
### Added
- **Custom Model Selector**: Replaced the native browser dropdown with a custom, styled component for selecting models in API Key settings.
- **Enhanced UI**: The model selector now matches the application's design language, theme, and parent container width.

### Changed
- **Model List Behavior**: The dropdown now displays all available cached models regardless of the current text input, improving discoverability.
- **Token Usage Display**: Improved layout and integration with the new model fetching logic.

## [1.3.2] - 2024-05-24
### Added
- **New Themes**: Added 'Sunrise' (Orange/Warm) and 'Lime' (Green) themes.
- **Adaptive Icon**: Added setting to make the Kirby icon adapt colors based on the selected theme.
- **Model Name Visibility**: Added a setting toggle to hide/show the model name in chat bubbles.
- **Documentation**: Added direct links to the GitHub repository for Script Filter examples.

### Changed
- Refactored `Kirby` component for better maintainability and theming support.
- Updated `ScriptFilterSettings` UI with clearer documentation links.
- Cleaned up translation strings.

## [1.3.1] - 2024-05-23
### Added
- Added `CHANGELOG.md`.
- Implemented handling for empty AI responses: if the model returns no text (e.g., due to safety filters), the chat bubble now displays the specific `finishReason` (e.g., `SAFETY`, `RECITATION`) to the user.
- Added custom `Toast` (Notification) and `CustomDialog` (Alert/Confirm/Input) components to provide a consistent, non-intrusive UI experience.
- Added footer with version number and AI disclaimer.
- Added "About & Open Source" section in Settings.
- Added visual watermark to README.

### Changed
- Replaced native browser `alert`, `confirm`, and `prompt` dialogs with custom UI components across the application (`App`, `Header`, `SettingsModal`, `ApiKeyManagement`).
- Refactored `SettingsModal` into modular components (`GeneralAppearanceSettings`, `ApiKeyManagement`, etc.) for better maintainability.
- Refactored `ChatInterface` to use a dedicated `ChatMessage` component.
- Removed "Rainbow" theme.
- Removed visual drag handles from sorting lists to maintain a cleaner UI while keeping functionality.

### Fixed
- Fixed various accessibility issues by adding ARIA labels.
- Fixed `Header.tsx` syntax error.
- Fixed `i18n.ts` trailing comma syntax errors.

## [1.3.0] - Previous
- Initial Drag-and-Drop support for API keys and System Prompts.
- UI/UX improvements.