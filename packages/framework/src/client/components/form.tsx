import { navigate } from "../lib/utils";
import axios from "axios";
import {
    useState,
    type FormHTMLAttributes,
    type ReactNode,
    type SubmitEventHandler,
} from "react";

export type FormAction =
    | string
    | ((formData: FormData) => void | Promise<void>);

/* =======================
 * Context Type
 * ======================= */
export type FormContext<T> = {
    data: T | undefined;
    errors: Record<string, string[]>;
    hasErrors: boolean;

    processing: boolean;
    progress: number | null;

    wasSuccessful: boolean;
    recentlySuccessful: boolean;

    setError: (field: string, message: string | string[]) => void;
    clearErrors: () => void;
    resetAndClearErrors: () => void;

    defaults: Record<string, any>;
    isDirty: boolean;
    reset: () => void;

    submit: () => void;
};

/* =======================
 * Props
 * ======================= */
// ⬇️ EXTEND native <form> props
export type FormProps<T> = {
    action?: string
    children:
    | ReactNode
    | ((form: FormContext<T>) => ReactNode);
} & Omit<Omit<FormHTMLAttributes<HTMLFormElement>, 'action'>, 'children'>

/* =======================
 * Component
 * ======================= */
export function Form<T>({
    children,
    method = "get",
    action,
    onSubmit: userOnSubmit,
    ...formProps
}: FormProps<T>) {
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [processing, setProcessing] = useState(false);
    const [wasSuccessful, setWasSuccessful] = useState(false);
    const [data, setData] = useState<T>();

    const resolveAction = () => {
        if (action) return action;

        if (typeof window !== "undefined") {
            return window.location.pathname + window.location.search;
        }

        return "";
    };

    const submit = async (form: HTMLFormElement) => {
        setProcessing(true);
        setErrors({});
        setWasSuccessful(false);

        const formData = new FormData(form);
        const url = resolveAction();

        /* ===== GET ===== */
        if (method.toLowerCase() === "get") {
            const params = new URLSearchParams(
                Array.from(formData.entries()).map(
                    ([key, value]) => [key, String(value)]
                )
            ).toString();

            const target = params ? `${url}?${params}` : url;

            await navigate(target);
            setProcessing(false);
            return;
        }

        /* ===== NON-GET ===== */
        try {
            const response = await axios({
                url,
                method,
                data: formData, // multipart/form-data (file OK)
                headers: {
                    'x-custom-navigation': 'true'
                }
            });

            setData(response.data)
            setWasSuccessful(true);
        } catch (err: any) {
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors || {});
            }
        } finally {
            setProcessing(false);
        }
    };

    const context: FormContext<T> = {
        data,
        errors,
        hasErrors: Object.keys(errors).length > 0,

        processing,
        progress: null,

        wasSuccessful,
        recentlySuccessful: wasSuccessful,

        setError(field, message) {
            setErrors((e) => ({
                ...e,
                [field]: Array.isArray(message) ? message : [message],
            }));
        },

        clearErrors() {
            setErrors({});
        },

        resetAndClearErrors() {
            setErrors({});
        },

        defaults: {},
        isDirty: false,

        reset() { },

        submit: () => {
            // noop, actual submit lewat onSubmit
        },
    };

    const onSubmit: SubmitEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();

        userOnSubmit?.(e); // biarkan user hook in
        submit(e.currentTarget); // ✅ SAFE
    };

    return (
        <form
            {...formProps}     // ✅ className, id, encType, dll
            action={action}
            method={method}
            onSubmit={onSubmit}
        >
            {typeof children === "function"
                ? children(context)
                : children}
        </form>
    );
}
