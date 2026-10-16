use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("launchctl error: {0}")]
    Launchctl(String),

    /// User-facing validation, consent, and availability messages.
    #[error("{0}")]
    Message(String),

    #[error("plist error: {0}")]
    Plist(String),

    #[error("io error: {0}")]
    Io(#[from] std::io::Error),

    #[error("file not found: {0}")]
    NotFound(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn user_facing_messages_have_no_subsystem_prefix() {
        let message = AppError::Message("Folder access is required.".into());
        assert_eq!(message.to_string(), "Folder access is required.");
        assert_eq!(
            serde_json::to_string(&message).unwrap(),
            "\"Folder access is required.\""
        );
        assert_eq!(
            AppError::Launchctl("exit 5".into()).to_string(),
            "launchctl error: exit 5"
        );
    }
}
