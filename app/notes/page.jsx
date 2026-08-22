import NotesLibrary from "@/components/NotesLibrary";
import { siteConfig } from "@/data/content";
import "./notes.css";

export const metadata = { title: `随手记 · ${siteConfig.brand}`, description: "检索、回看 xiaohey 的随手记录与思考线索。" };

export default function NotesPage() {
  return <NotesLibrary />;
}
