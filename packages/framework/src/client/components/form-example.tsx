import { Form } from "./form";

export default function FormExample() {
    return (
        <Form action="/books" method="post">
            {(form) => {
                return (
                    <>
                        <div>
                            <label htmlFor="title">Title</label>
                            <input
                                id="title"
                                name="title"
                                placeholder="Clean Architecture"
                                disabled={form.processing}
                            />
                            <input
                                id="code"
                                name="code"
                                placeholder="Clean Architecture"
                                disabled={form.processing}
                            />
                            {form.errors && (
                                <div style={{ color: "red" }}>
                                    {(form.errors.title || form.errors.code)?.join(", ")}
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={form.processing}
                            style={{
                                padding: "8px 14px",
                                opacity: form.processing ? 0.6 : 1,
                            }}
                        >
                            {form.processing ? "Saving..." : "Save"}
                        </button>

                        {form.wasSuccessful && (
                            <div style={{ marginTop: 12 }}>
                                <strong>Response:</strong>
                                <pre>
                                    {JSON.stringify(form.data, null, 2)}
                                </pre>
                            </div>
                        )}
                    </>
                )
            }}
        </Form>
    );
}
