import { styled } from "../../stitches.config";
import { TaskSubmitPanel } from "../session/TaskSubmitPanel";
import { TaskDetailPanel } from "./TaskDetailPanel";

const DismissLink = styled("button", {
  display: "block",
  margin: "$4 auto 0",
  background: "none",
  border: "none",
  color: "inherit",
  font: "inherit",
  fontSize: "0.8125rem",
  opacity: 0.55,
  cursor: "pointer",
  textDecoration: "underline",
  "&:hover": { opacity: 0.85 },
});

type TaskChatWorkspaceProps = {
  activeTaskId: number | null;
  onTaskCreated: (task: { taskId: number; userQuery: string }) => void;
  onDismiss: () => void;
  onSubmitted?: () => void;
};

export function TaskChatWorkspace({
  activeTaskId,
  onTaskCreated,
  onDismiss,
  onSubmitted,
}: TaskChatWorkspaceProps) {
  return (
    <>
      <TaskSubmitPanel variant="chat" onSubmitted={onSubmitted} onTaskCreated={onTaskCreated} />

      {activeTaskId != null && (
        <>
          <TaskDetailPanel taskId={activeTaskId} />
          <DismissLink type="button" onClick={onDismiss}>
            Ask something else
          </DismissLink>
        </>
      )}
    </>
  );
}
