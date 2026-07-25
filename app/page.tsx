import { redirect } from "next/navigation";

/**
 * Root: stuur door naar de app. De middleware bepaalt vervolgens of de user
 * naar /analyses mag (ingelogd) of naar /login (niet ingelogd).
 */
export default function Home() {
  redirect("/analyses");
}
