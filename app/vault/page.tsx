import { redirect } from "next/navigation";

// Vault has been merged into Portfolio. Redirect legacy URL.
export default function VaultPage() {
  redirect("/portfolio");
}
