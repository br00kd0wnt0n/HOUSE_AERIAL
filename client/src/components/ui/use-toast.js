import * as React from "react";

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastTitle,
  ToastProvider,
  ToastViewport
} from "./toast";

const TOAST_REMOVE_DELAY = 5000; // 5 seconds

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
};

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

const toastTimeouts = new Map();

const addToRemoveQueue = (toastId) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: actionTypes.REMOVE_TOAST,
      toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

const reducer = (state, action) => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [
          ...state.toasts,
          { ...action.toast, id: action.toast?.id || genId() },
        ],
      };
    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toastId ? { ...t, ...action.toast } : t
        ),
      };
    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action;

      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      };
    }
    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
    default:
      return state;
  }
};

const listeners = [];

let memoryState = { toasts: [] };

function dispatch(action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

function useToast() {
  const [state, setState] = React.useState(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    toast: (props) => {
      const id = genId();

      const update = (props) =>
        dispatch({
          type: actionTypes.UPDATE_TOAST,
          toast: { ...props },
          toastId: id,
        });

      const dismiss = () =>
        dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id });

      dispatch({
        type: actionTypes.ADD_TOAST,
        toast: {
          ...props,
          id,
          open: true,
          onOpenChange: (open) => {
            if (!open) dismiss();
          },
        },
      });

      // Auto-dismiss after timeout
      const duration = props.duration || TOAST_REMOVE_DELAY;
      if (duration > 0) {
        setTimeout(dismiss, duration);
      }

      return {
        id,
        dismiss,
        update,
      };
    },
    dismiss: (toastId) =>
      dispatch({ type: actionTypes.DISMISS_TOAST, toastId }),
  };
}

function Toaster({ position = "bottom-right", toastOptions = {} }) {
  const { toasts } = useToast();
  
  // Generate position classes based on position prop
  const getPositionClasses = () => {
    switch (position) {
      case "top-right":
        return "top-0 right-0";
      case "top-left":
        return "top-0 left-0";
      case "bottom-left":
        return "bottom-0 left-0";
      case "bottom-right":
      default:
        return "bottom-0 right-0";
    }
  };
  
  const positionClasses = getPositionClasses();

  return (
    <ToastProvider>
      <div className={`fixed ${positionClasses} z-[100] flex flex-col gap-2 p-4 max-h-screen w-full sm:max-w-[420px] overflow-hidden`}>
        {toasts.map(({ id, title, description, action, ...props }) => (
          <Toast key={id} {...props} {...toastOptions}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        ))}
      </div>
      <ToastViewport />
    </ToastProvider>
  );
}

export { useToast, Toaster }; 