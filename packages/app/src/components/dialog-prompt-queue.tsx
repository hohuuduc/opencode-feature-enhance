import { Component } from "solid-js"
import { Dialog } from "@opencode-ai/ui/dialog"
import { Button } from "@opencode-ai/ui/button"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { useLanguage } from "@/context/language"

export type PromptQueueChoice = "queue" | "steer" | "cancel"

// Shown when the user sends a message while a session is busy. The three
// choices map onto the existing follow-up flow: "queue" defers the message
// until the session returns to idle, "steer" sends immediately (the default
// opencode behavior), and "cancel" aborts the send and keeps the draft.
export const DialogPromptQueue: Component<{
  onChoose: (choice: PromptQueueChoice) => void
}> = (props) => {
  const dialog = useDialog()
  const language = useLanguage()

  const choose = (choice: PromptQueueChoice) => {
    props.onChoose(choice)
    dialog.close()
  }

  return (
    <Dialog
      fit
      title={language.t("dialog.promptQueue.title")}
      description={language.t("dialog.promptQueue.description")}
    >
      <div class="flex flex-row justify-end gap-2 p-3">
        <Button variant="ghost" size="normal" onClick={() => choose("cancel")}>
          {language.t("dialog.promptQueue.action.cancel")}
        </Button>
        <Button variant="secondary" size="normal" onClick={() => choose("queue")}>
          {language.t("dialog.promptQueue.action.queue")}
        </Button>
        <Button
          variant="primary"
          size="normal"
          autofocus
          onClick={() => choose("steer")}
        >
          {language.t("dialog.promptQueue.action.steer")}
        </Button>
      </div>
    </Dialog>
  )
}