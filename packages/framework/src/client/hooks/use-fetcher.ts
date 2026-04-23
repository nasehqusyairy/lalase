import { useState } from 'react';
import axios from 'axios';

type FetcherState = 'idle' | 'submitting';

export function useFetcher<T = any>() {
    const [state, setState] = useState<FetcherState>('idle');
    const [data, setData] = useState<T | null>(null);
    const [errors, setErrors] = useState<any>(null);

    async function submit(
        payload: any,
        options: {
            method?: string;
            action: string;
        }
    ) {
        setState('submitting');
        setErrors(null);

        try {
            const res = await axios({
                method: options.method ?? 'post',
                url: options.action,
                data: payload
            });

            setData(res.data);
        } catch (err: any) {
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors);
            }
        } finally {
            setState('idle');
        }
    }

    return {
        submit,
        state,
        data,
        errors
    };
}
