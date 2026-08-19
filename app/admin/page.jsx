import "./admin.css";
import AdminStudio from "@/components/AdminStudio";

export const metadata = {
  title: "xiaohey Editor · 内容编辑台",
  description: "xiaohey 私人内容编辑与发布后台。",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminStudio />;
}
