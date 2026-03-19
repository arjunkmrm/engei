import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import CommentCard from "./CommentCard"
import type { Comment } from "../types"

const baseComment: Comment = {
  id: "c1",
  anchor: { exact: "test", prefix: "", suffix: "", hint: 0 },
  body: "This is a comment",
  author: "Alice",
  createdAt: new Date().toISOString(),
  replies: [],
}

const noop = () => {}

describe("CommentCard", () => {
  it("renders comment body and author", () => {
    render(
      <CommentCard
        comment={baseComment}
        isActive={false}
        onActivate={noop}
        onDeactivate={noop}
        onDelete={noop}
        onSubmitBody={noop}
        onAddReply={noop}
      />
    )

    expect(screen.getByText("This is a comment")).toBeInTheDocument()
    expect(screen.getByText("Alice")).toBeInTheDocument()
  })

  it("draft mode: shows textarea when body is empty", () => {
    const draft = { ...baseComment, body: "" }
    render(
      <CommentCard
        comment={draft}
        isActive={true}
        onActivate={noop}
        onDeactivate={noop}
        onDelete={noop}
        onSubmitBody={noop}
        onAddReply={noop}
      />
    )

    expect(screen.getByPlaceholderText("Type your comment...")).toBeInTheDocument()
    expect(screen.getByText("Post")).toBeInTheDocument()
    expect(screen.getByText("Cancel")).toBeInTheDocument()
  })

  it("draft submit calls onSubmitBody", async () => {
    const onSubmitBody = vi.fn()
    const draft = { ...baseComment, body: "" }
    render(
      <CommentCard
        comment={draft}
        isActive={true}
        onActivate={noop}
        onDeactivate={noop}
        onDelete={noop}
        onSubmitBody={onSubmitBody}
        onAddReply={noop}
      />
    )

    const textarea = screen.getByPlaceholderText("Type your comment...")
    await userEvent.type(textarea, "My comment")
    fireEvent.click(screen.getByText("Post"))

    expect(onSubmitBody).toHaveBeenCalledWith("c1", "My comment")
  })

  it("draft cancel calls onDelete", () => {
    const onDelete = vi.fn()
    const draft = { ...baseComment, body: "" }
    render(
      <CommentCard
        comment={draft}
        isActive={true}
        onActivate={noop}
        onDeactivate={noop}
        onDelete={onDelete}
        onSubmitBody={noop}
        onAddReply={noop}
      />
    )

    fireEvent.click(screen.getByText("Cancel"))
    expect(onDelete).toHaveBeenCalledWith("c1")
  })

  it("shows replies when present", () => {
    const withReplies = {
      ...baseComment,
      replies: [
        { id: "r1", body: "Great point!", author: "Bob", createdAt: new Date().toISOString() },
      ],
    }
    render(
      <CommentCard
        comment={withReplies}
        isActive={false}
        onActivate={noop}
        onDeactivate={noop}
        onDelete={noop}
        onSubmitBody={noop}
        onAddReply={noop}
      />
    )

    expect(screen.getByText("Great point!")).toBeInTheDocument()
    expect(screen.getByText("Bob")).toBeInTheDocument()
  })

  it("active state shows reply input", () => {
    render(
      <CommentCard
        comment={baseComment}
        isActive={true}
        onActivate={noop}
        onDeactivate={noop}
        onDelete={noop}
        onSubmitBody={noop}
        onAddReply={noop}
      />
    )

    expect(screen.getByPlaceholderText("Reply...")).toBeInTheDocument()
  })

  it("reply submit calls onAddReply and clears input", async () => {
    const onAddReply = vi.fn()
    render(
      <CommentCard
        comment={baseComment}
        isActive={true}
        onActivate={noop}
        onDeactivate={noop}
        onDelete={noop}
        onSubmitBody={noop}
        onAddReply={onAddReply}
      />
    )

    const input = screen.getByPlaceholderText("Reply...")
    await userEvent.type(input, "My reply{enter}")

    expect(onAddReply).toHaveBeenCalledWith("c1", "My reply")
    expect(input).toHaveValue("")
  })

  it("Escape key calls onDeactivate", async () => {
    const onDeactivate = vi.fn()
    render(
      <CommentCard
        comment={baseComment}
        isActive={true}
        onActivate={noop}
        onDeactivate={onDeactivate}
        onDelete={noop}
        onSubmitBody={noop}
        onAddReply={noop}
      />
    )

    const input = screen.getByPlaceholderText("Reply...")
    await userEvent.type(input, "{Escape}")

    expect(onDeactivate).toHaveBeenCalled()
  })
})
