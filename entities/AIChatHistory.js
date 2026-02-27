{
  "name": "AIChatHistory",
  "type": "object",
  "properties": {
    "owner_id": {
      "type": "string"
    },
    "messages": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "role": {
            "type": "string",
            "enum": [
              "user",
              "assistant"
            ]
          },
          "content": {
            "type": "string"
          },
          "timestamp": {
            "type": "string"
          }
        }
      }
    }
  },
  "required": [
    "owner_id"
  ]
}
