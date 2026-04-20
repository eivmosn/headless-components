/**
 * AI 聊天历史记录表
 *
 * 设计目标：
 * - 一条消息只表达一个角色的一次发言，用户消息和 AI 答案用 role 区分。
 * - 文本、图片、文件、引用都用结构化字段保存，渲染层不用反向解析字符串。
 * - 支持流式回答：AI 消息可以先创建为 streaming，再持续追加内容。
 * - 存储层默认使用 localStorage，后续可以替换成 IndexedDB / 服务端接口。
 */

export type ChatRole = 'user' | 'assistant' | 'system'

export type ChatMessageStatus = 'pending' | 'streaming' | 'done' | 'error' | 'aborted'

export type ChatContentPart
  = | ChatTextPart
    | ChatImagePart
    | ChatFilePart
    | ChatAudioPart
    | ChatVideoPart

export interface ChatTextPart {
  type: 'text'
  text: string
}

export interface ChatImagePart {
  type: 'image'
  url: string
  name?: string
  mimeType?: string
  size?: number
  width?: number
  height?: number
}

export interface ChatFilePart {
  type: 'file'
  url: string
  name: string
  mimeType?: string
  size?: number
}

export interface ChatAudioPart {
  type: 'audio'
  url: string
  name?: string
  mimeType?: string
  size?: number
  duration?: number
}

export interface ChatVideoPart {
  type: 'video'
  url: string
  name?: string
  mimeType?: string
  size?: number
  width?: number
  height?: number
  duration?: number
}

export interface ChatAttachment {
  id: string
  type: 'image' | 'file' | 'audio' | 'video'
  url: string
  name: string
  mimeType?: string
  size?: number
  width?: number
  height?: number
  duration?: number
  uploadStatus?: 'local' | 'uploading' | 'uploaded' | 'failed'
  error?: string
  createdAt: number
}

export interface ChatReference {
  id: string
  /**
   * 被引用内容的来源，message 表示引用历史消息，attachment 表示引用附件。
   */
  type: 'message' | 'attachment' | 'link' | 'document'
  title?: string
  url?: string
  messageId?: string
  attachmentId?: string
  /**
   * 引用片段，适合保存被选中的原文、文档摘要、网页摘录等。
   */
  quote?: string
  /**
   * 文档页码、代码行号、视频时间戳等定位信息。
   */
  locator?: string
}

export interface ChatUsage {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
}

export interface ChatMessageBase {
  id: string
  role: ChatRole
  content: ChatContentPart[]
  attachments: ChatAttachment[]
  references: ChatReference[]
  status: ChatMessageStatus
  createdAt: number
  updatedAt: number
  parentId?: string
  metadata?: Record<string, unknown>
}

export interface UserChatMessage extends ChatMessageBase {
  role: 'user'
}

export interface AssistantChatMessage extends ChatMessageBase {
  role: 'assistant'
  model?: string
  usage?: ChatUsage
  error?: string
}

export interface SystemChatMessage extends ChatMessageBase {
  role: 'system'
}

export type ChatMessage = UserChatMessage | AssistantChatMessage | SystemChatMessage

export interface ChatConversation {
  id: string
  title: string
  messages: ChatMessage[]
  pinned?: boolean
  archived?: boolean
  createdAt: number
  updatedAt: number
  metadata?: Record<string, unknown>
}

export interface CreateMessageOptions {
  id?: string
  role: ChatRole
  text?: string
  content?: ChatContentPart[]
  attachments?: ChatAttachment[]
  references?: ChatReference[]
  parentId?: string
  status?: ChatMessageStatus
  model?: string
  metadata?: Record<string, unknown>
}

export interface CreateConversationOptions {
  id?: string
  title?: string
  messages?: ChatMessage[]
  metadata?: Record<string, unknown>
}

export interface ChatHistoryStorage {
  list: () => ChatConversation[]
  get: (conversationId: string) => ChatConversation | undefined
  save: (conversation: ChatConversation) => void
  remove: (conversationId: string) => void
  clear: () => void
}

export const CHAT_HISTORY_STORAGE_KEY = 'ai-chat:history'

export function createId(prefix = 'chat'): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export function createTextPart(text: string): ChatTextPart {
  return {
    type: 'text',
    text,
  }
}

export function createAttachment(options: Omit<ChatAttachment, 'id' | 'createdAt'> & {
  id?: string
  createdAt?: number
}): ChatAttachment {
  return {
    ...options,
    id: options.id ?? createId('attachment'),
    createdAt: options.createdAt ?? Date.now(),
  }
}

export function createReference(options: Omit<ChatReference, 'id'> & {
  id?: string
}): ChatReference {
  return {
    ...options,
    id: options.id ?? createId('reference'),
  }
}

export function createMessage(options: CreateMessageOptions): ChatMessage {
  const now = Date.now()
  const content = options.content ?? (options.text ? [createTextPart(options.text)] : [])
  const base = {
    id: options.id ?? createId('message'),
    role: options.role,
    content,
    attachments: options.attachments ?? [],
    references: options.references ?? [],
    status: options.status ?? 'done',
    createdAt: now,
    updatedAt: now,
    parentId: options.parentId,
    metadata: options.metadata,
  }

  if (options.role === 'assistant') {
    return {
      ...base,
      role: 'assistant',
      model: options.model,
    }
  }

  if (options.role === 'system') {
    return {
      ...base,
      role: 'system',
    }
  }

  return {
    ...base,
    role: 'user',
  }
}

export function createConversation(options: CreateConversationOptions = {}): ChatConversation {
  const now = Date.now()

  return {
    id: options.id ?? createId('conversation'),
    title: options.title ?? '新的对话',
    messages: options.messages ?? [],
    createdAt: now,
    updatedAt: now,
    metadata: options.metadata,
  }
}

export function appendMessage(conversation: ChatConversation, message: ChatMessage): ChatConversation {
  return {
    ...conversation,
    messages: [...conversation.messages, message],
    updatedAt: Date.now(),
  }
}

export function removeMessage(conversation: ChatConversation, messageId: string): ChatConversation {
  const messages = conversation.messages.filter(message => message.id !== messageId)

  if (messages.length === conversation.messages.length) {
    return conversation
  }

  return {
    ...conversation,
    messages,
    updatedAt: Date.now(),
  }
}

export function updateMessage(
  conversation: ChatConversation,
  messageId: string,
  updater: Partial<ChatMessage> | ((message: ChatMessage) => ChatMessage),
): ChatConversation {
  let changed = false
  const messages = conversation.messages.map((message) => {
    if (message.id !== messageId) {
      return message
    }

    changed = true
    const nextMessage = typeof updater === 'function'
      ? updater(message)
      : {
          ...message,
          ...updater,
        } as ChatMessage

    return {
      ...nextMessage,
      updatedAt: Date.now(),
    } as ChatMessage
  })

  if (!changed) {
    return conversation
  }

  return {
    ...conversation,
    messages,
    updatedAt: Date.now(),
  }
}

export function appendAssistantText(
  conversation: ChatConversation,
  messageId: string,
  text: string,
): ChatConversation {
  return updateMessage(conversation, messageId, (message) => {
    if (message.role !== 'assistant') {
      return message
    }

    const lastPart = message.content.at(-1)

    if (lastPart?.type === 'text') {
      return {
        ...message,
        content: [
          ...message.content.slice(0, -1),
          {
            ...lastPart,
            text: `${lastPart.text}${text}`,
          },
        ],
      }
    }

    return {
      ...message,
      content: [...message.content, createTextPart(text)],
    }
  })
}

export function markMessageDone(conversation: ChatConversation, messageId: string): ChatConversation {
  return updateMessage(conversation, messageId, {
    status: 'done',
  })
}

export function markMessageError(
  conversation: ChatConversation,
  messageId: string,
  error: string,
): ChatConversation {
  return updateMessage(conversation, messageId, (message) => {
    if (message.role !== 'assistant') {
      return {
        ...message,
        status: 'error',
      }
    }

    return {
      ...message,
      status: 'error',
      error,
    }
  })
}

export class LocalChatHistoryStorage implements ChatHistoryStorage {
  private readonly storageKey: string

  constructor(storageKey = CHAT_HISTORY_STORAGE_KEY) {
    this.storageKey = storageKey
  }

  list(): ChatConversation[] {
    return this.read()
  }

  get(conversationId: string): ChatConversation | undefined {
    return this.read().find(conversation => conversation.id === conversationId)
  }

  save(conversation: ChatConversation): void {
    const conversations = this.read()
    const index = conversations.findIndex(item => item.id === conversation.id)

    if (index >= 0) {
      conversations.splice(index, 1, conversation)
    }
    else {
      conversations.unshift(conversation)
    }

    this.write(sortConversations(conversations))
  }

  remove(conversationId: string): void {
    this.write(this.read().filter(conversation => conversation.id !== conversationId))
  }

  clear(): void {
    this.write([])
  }

  private read(): ChatConversation[] {
    if (!canUseLocalStorage()) {
      return []
    }

    try {
      const raw = localStorage.getItem(this.storageKey)

      if (!raw) {
        return []
      }

      const value = JSON.parse(raw)

      return Array.isArray(value) ? value : []
    }
    catch {
      return []
    }
  }

  private write(conversations: ChatConversation[]): void {
    if (!canUseLocalStorage()) {
      return
    }

    localStorage.setItem(this.storageKey, JSON.stringify(conversations))
  }
}

export const chatHistoryStorage = new LocalChatHistoryStorage()

function sortConversations(conversations: ChatConversation[]): ChatConversation[] {
  return [...conversations].sort((a, b) => b.updatedAt - a.updatedAt)
}

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}
