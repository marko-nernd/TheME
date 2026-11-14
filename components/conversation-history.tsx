"use client";

import { useMemo, useState } from "react";
import CollaborationThread from "@/components/collaboration-thread";

const peoplePerPage = 10;
const messagesPerPage = 20;

type ConversationMessage = {
  id: string;
  senderMemberId: string;
  senderName: string;
  body: string;
  createdAt: string;
};

type ConversationRequest = {
  id: string;
  subject: string;
  eventTitle: string | null;
  initialMessage: string;
  initialSenderId: string;
  initialSenderName: string;
  createdAt: string;
  messages: ConversationMessage[];
};

type ConversationPerson = {
  id: string;
  name: string;
  roleLabel: string;
  latestAt: string;
  requests: ConversationRequest[];
};

function PersonConversation({
  currentMemberId,
  person,
}: {
  currentMemberId: string;
  person: ConversationPerson;
}) {
  const [messagePage, setMessagePage] = useState(1);
  const messages = useMemo(
    () =>
      person.requests
        .flatMap((request) => [
          {
            id: `initial-${request.id}`,
            requestId: request.id,
            subject: request.subject,
            eventTitle: request.eventTitle,
            senderMemberId: request.initialSenderId,
            senderName: request.initialSenderName,
            body: request.initialMessage,
            createdAt: request.createdAt,
          },
          ...request.messages.map((message) => ({
            ...message,
            requestId: request.id,
            subject: request.subject,
            eventTitle: request.eventTitle,
          })),
        ])
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [person.requests],
  );
  const pageCount = Math.max(1, Math.ceil(messages.length / messagesPerPage));
  const currentPage = Math.min(messagePage, pageCount);
  const visibleMessages = messages
    .slice((currentPage - 1) * messagesPerPage, currentPage * messagesPerPage)
    .reverse();
  const newestRequest = [...person.requests].sort((a, b) => {
    const aLatest = [a.createdAt, ...a.messages.map((message) => message.createdAt)]
      .reduce((latest, value) => Math.max(latest, new Date(value).getTime()), 0);
    const bLatest = [b.createdAt, ...b.messages.map((message) => message.createdAt)]
      .reduce((latest, value) => Math.max(latest, new Date(value).getTime()), 0);
    return bLatest - aLatest;
  })[0];

  return (
    <details className="person-conversation">
      <summary>
        <span className="conversation-person-avatar">{person.name.slice(0, 1).toUpperCase()}</span>
        <span>
          <strong>{person.name}</strong>
          <small>{person.roleLabel} · {messages.length} message{messages.length === 1 ? "" : "s"}</small>
        </span>
        <b aria-hidden="true">⌄</b>
      </summary>
      <div className="person-conversation-body">
        <div className="person-message-list" aria-live="polite">
          {visibleMessages.map((message) => (
            <article className={message.senderMemberId === currentMemberId ? "is-mine" : ""} key={message.id}>
              <header>
                <strong>{message.senderMemberId === currentMemberId ? "You" : message.senderName}</strong>
                <small>
                  {message.eventTitle ? `${message.eventTitle} · ` : ""}
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(message.createdAt))}
                </small>
              </header>
              <span>{message.subject}</span>
              <p>{message.body}</p>
            </article>
          ))}
        </div>
        {pageCount > 1 && (
          <nav className="conversation-pagination" aria-label={`${person.name} message pages`}>
            <button type="button" disabled={currentPage === 1} onClick={() => setMessagePage((page) => Math.max(1, page - 1))}>
              Newer
            </button>
            <span>Page {currentPage} of {pageCount} · 20 messages per page</span>
            <button type="button" disabled={currentPage === pageCount} onClick={() => setMessagePage((page) => Math.min(pageCount, page + 1))}>
              Older
            </button>
          </nav>
        )}
        {newestRequest && (
          <CollaborationThread
            requestId={newestRequest.id}
            currentMemberId={currentMemberId}
            messages={[]}
            showMessages={false}
          />
        )}
      </div>
    </details>
  );
}

export default function ConversationHistory({
  currentMemberId,
  people,
}: {
  currentMemberId: string;
  people: ConversationPerson[];
}) {
  const [peoplePage, setPeoplePage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(people.length / peoplePerPage));
  const currentPage = Math.min(peoplePage, pageCount);
  const visiblePeople = people.slice(
    (currentPage - 1) * peoplePerPage,
    currentPage * peoplePerPage,
  );

  return (
    <div className="host-conversation-history">
      <header>
        <span>MESSAGE HISTORY</span>
        <h3>Your conversations</h3>
        <p>Open a person to see up to 20 messages at a time. Conversation pages show up to 10 people.</p>
      </header>
      {visiblePeople.length ? (
        visiblePeople.map((person) => (
          <PersonConversation currentMemberId={currentMemberId} person={person} key={person.id} />
        ))
      ) : (
        <p className="dashboard-empty">Accepted conversations with other members will appear here.</p>
      )}
      {pageCount > 1 && (
        <nav className="conversation-pagination conversation-people-pagination" aria-label="Conversation people pages">
          <button type="button" disabled={currentPage === 1} onClick={() => setPeoplePage((page) => Math.max(1, page - 1))}>
            Previous people
          </button>
          <span>Page {currentPage} of {pageCount} · 10 people per page</span>
          <button type="button" disabled={currentPage === pageCount} onClick={() => setPeoplePage((page) => Math.min(pageCount, page + 1))}>
            Next people
          </button>
        </nav>
      )}
    </div>
  );
}
