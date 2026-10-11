import { Link } from "react-router";
import { Card } from "../components/Card";

export function NotFoundPage() {
  return (
    <Card>
      <p className="text-sm text-ink-muted">
        Alamat yang dibuka tidak ada.{" "}
        <Link to="/" className="font-semibold text-brand hover:underline">
          Kembali ke Dashboard
        </Link>
      </p>
    </Card>
  );
}
