import { Redirect } from "expo-router";

import { useAuth } from "../state/auth";

export default function Index() {
    const { token, hydrating } = useAuth();

    if (hydrating) return null;

    return <Redirect href={token ? "/report" : "/login"} />;
}
