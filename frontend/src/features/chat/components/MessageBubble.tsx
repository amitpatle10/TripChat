import { useState } from 'react'
import type { MessageResponse } from '@/types'

interface MessageBubbleProps {
  message: MessageResponse
  isOwn: boolean
  onDelete?: (messageId: string) => void
}

// Pure presenter — no hooks except local hover state. Testable with just props.
export default function MessageBubble({ message, isOwn, onDelete }: MessageBubbleProps) {
  const [hovered, setHovered] = useState(false)

  // Optimistic messages (not yet confirmed by server) render at reduced opacity.
  const isOptimistic = !message.id || message.id.startsWith('optimistic-')

  const time = new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(message.createdAt))

  // Deleted messages show a tombstone — no content, no sender.
  if (message.deleted) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} px-4 mb-1`}>
        <p className="text-gray-500 text-sm italic">This message was deleted</p>
      </div>
    )
  }

  const senderName = message.senderDisplayName ?? 'Deleted User'

  // Show delete button only for own confirmed messages (not optimistic, not deleted)
  const canDelete = isOwn && !isOptimistic && !!onDelete

  // items-end on the outer row makes the delete button gravity-fall to the
  // bottom of the row — it always sits level with the timestamp, hugging the
  // bottom-left corner of the bubble regardless of bubble width.
  return (
    <div
      className={`flex items-end ${isOwn ? 'justify-end' : 'justify-start'} px-4 mb-1`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Delete button lives OUTSIDE the message column so timestamp width
          can never push it away from the bubble. */}
      {canDelete && (
        <button
          onClick={() => onDelete(message.id)}
          className={`
            flex-shrink-0 p-1 mr-1 rounded text-red-500 hover:text-red-400 hover:bg-gray-800
            transition-opacity duration-150
            ${hovered ? 'opacity-100' : 'opacity-0'}
          `}
          title="Delete message"
          aria-label="Delete message"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </button>
      )}

      {/* Message column — bubble + timestamp stacked */}
      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%] min-w-0`}>

        {/* Sender name — only shown for messages from others */}
        {!isOwn && (
          <span className="text-xs text-gray-400 mb-0.5 px-1">{senderName}</span>
        )}

        <div
          className={`
            px-3 py-2 rounded-2xl text-sm leading-relaxed break-all
            ${isOwn
              ? 'bg-indigo-600 text-white rounded-br-sm'
              : 'bg-gray-800 text-gray-100 rounded-bl-sm'
            }
          `}
        >
          {message.content}
        </div>

        {/* Timestamp row — own messages get a delivery dot on the left */}
        <div className="flex items-center gap-1.5 mt-0.5 px-1">
          {isOwn && (
            <span
              className={`
                w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-500
                ${isOptimistic ? 'bg-gray-500' : 'bg-green-500'}
              `}
              aria-label={isOptimistic ? 'Sending' : 'Delivered'}
            />
          )}
          <span className="text-xs text-gray-500 whitespace-nowrap">{time}</span>
        </div>

      </div>
    </div>
  )
}
