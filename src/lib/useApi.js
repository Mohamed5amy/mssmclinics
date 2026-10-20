import { useCallback, useEffect, useState } from "react";
import { get } from "./api";

/**
 * Loads `url` (with `params`) and reloads when they change. Pass a falsy url to
 * wait. Returns { data, loading, error, reload, setData }.
 */
export function useApi(url, params) {
    const key = url ? url + JSON.stringify(params ?? {}) : "";
    const [state, setState] = useState({ data: null, loading: !!url, error: null });

    const reload = useCallback(
        (quiet = false) => {
            if (!url) return Promise.resolve();
            if (!quiet) setState((current) => ({ ...current, loading: true }));
            return get(url, params)
                .then((data) => setState({ data, loading: false, error: null }))
                .catch((error) => setState({ data: null, loading: false, error }));
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [key],
    );

    useEffect(() => {
        reload();
    }, [reload]);

    const setData = useCallback((update) => {
        setState((current) => ({ ...current, data: typeof update === "function" ? update(current.data) : update }));
    }, []);

    return { ...state, reload, setData };
}
