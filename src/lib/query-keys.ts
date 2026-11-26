export const queryKeys = {
  me: ['me'] as const,
  chats: ['chats'] as const,
  chat: (chatId: string) => ['chat', chatId] as const,
  templates: ['templates'] as const,
  users: ['users'] as const,
}
