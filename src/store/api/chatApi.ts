import { ChatStreamError, streamChat } from '@/lib/ai/chatStream';
import { connectionMessage } from '@/lib/apiError';
import type { ChatDonePayload, ChatMessage, ChatSession, CreateSessionRequest } from '@/types/chat';
import { api } from './baseApi';

const apiWithTags = api.enhanceEndpoints({ addTagTypes: ['ChatSessions', 'ChatMessages', 'Entitlements'] });

export interface SendChatMessageArgs {
  sessionId: string;
  content: string;
  signal?: AbortSignal;
  /** called for every streamed text chunk */
  onToken?: (text: string) => void;
}

export interface SendChatMessageResult {
  /** full answer text as streamed */
  content: string;
  done: ChatDonePayload;
}

export const chatApi = apiWithTags.injectEndpoints({
  overrideExisting: 'throw',
  endpoints: (builder) => ({
    listChatSessions: builder.query<ChatSession[], void>({
      query: () => '/chat/sessions',
      transformResponse: (r: { sessions: ChatSession[] }) => r.sessions,
      providesTags: [{ type: 'ChatSessions', id: 'LIST' }],
    }),

    createChatSession: builder.mutation<ChatSession, CreateSessionRequest | void>({
      query: (body) => ({ url: '/chat/sessions', method: 'POST', body: body ?? {} }),
      transformResponse: (r: { session: ChatSession }) => r.session,
      invalidatesTags: [{ type: 'ChatSessions', id: 'LIST' }],
    }),

    deleteChatSession: builder.mutation<void, string>({
      query: (id) => ({ url: `/chat/sessions/${encodeURIComponent(id)}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'ChatSessions', id: 'LIST' }, { type: 'ChatMessages', id }],
    }),

    getChatMessages: builder.query<ChatMessage[], string>({
      query: (sessionId) => `/chat/sessions/${encodeURIComponent(sessionId)}/messages`,
      transformResponse: (r: { messages: ChatMessage[] }) => r.messages,
      providesTags: (_r, _e, id) => [{ type: 'ChatMessages', id }],
    }),

    /**
     * Streams the answer through chatStream (RTK Query's fetch cannot read SSE). The stored messages are then
     * refetched, so the cache holds the server's ids and the quota meter updates.
     */
    sendChatMessage: builder.mutation<SendChatMessageResult, SendChatMessageArgs>({
      async queryFn({ sessionId, content, signal, onToken }) {
        let text = '';
        try {
          const done = await streamChat({
            sessionId,
            content,
            signal,
            onToken: (t) => {
              text += t;
              onToken?.(t);
            },
          });
          return { data: { content: text, done } };
        } catch (e) {
          if (e instanceof ChatStreamError) {
            return { error: { status: e.status, data: { errorCode: e.code, message: e.message, error: { code: e.code, feature: e.feature, limit: e.limit, resetsAt: e.resetsAt } }, partial: text } as never };
          }
          if ((e as Error)?.name === 'AbortError') return { error: { status: 'CUSTOM_ERROR', error: 'aborted', data: { aborted: true, partial: text } } as never };
          return { error: { status: 'FETCH_ERROR', error: String(e), data: connectionMessage('network') } as never };
        }
      },
      invalidatesTags: (_r, _e, { sessionId }) => [{ type: 'ChatMessages', id: sessionId }, { type: 'ChatSessions', id: 'LIST' }, 'Entitlements'],
    }),
  }),
});

export const { useListChatSessionsQuery, useCreateChatSessionMutation, useDeleteChatSessionMutation, useGetChatMessagesQuery, useSendChatMessageMutation } = chatApi;
