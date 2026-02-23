import { BrainCircuit, Database, FileText, CalendarClock, Users, Shield } from "lucide-react";

export default function FeaturesPage() {
    const features = [
        {
            title: "Company DNA Ingestion",
            description: "Upload PDFs, docs, and text files. We automatically process, chunk, and index your company's knowledge into a secure vector database.",
            icon: <Database className="h-6 w-6 text-primary" />
        },
        {
            title: "Chat with Company Brain",
            description: "Quickly find answers from your internal documents with RAG (Retrieval-Augmented Generation). Includes streaming responses just like ChatGPT.",
            icon: <BrainCircuit className="h-6 w-6 text-primary" />
        },
        {
            title: "Templates & Artifacts",
            description: "Generate structured documents—business plans, marketing strategies, social media posts—using custom prompt templates.",
            icon: <FileText className="h-6 w-6 text-primary" />
        },
        {
            title: "Approval & Scheduling",
            description: "Review AI-generated artifacts and approve them. Set a publish date and timezone to automate your content schedules.",
            icon: <CalendarClock className="h-6 w-6 text-primary" />
        },
        {
            title: "Role-based Access",
            description: "Manage multiple workspaces. Assign roles (Super Admin, Admin, Employee) to ensure authorized access to specific templates and DNA.",
            icon: <Users className="h-6 w-6 text-primary" />
        },
        {
            title: "Usage Limits & Billing",
            description: "Track your token usage across users and workspaces. Predictable monthly pricing for storage and generated tokens.",
            icon: <Shield className="h-6 w-6 text-primary" />
        }
    ];

    return (
        <div className="py-20 px-4 md:px-8 max-w-6xl mx-auto">
            <div className="text-center mb-16">
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Features</h1>
                <p className="mt-4 text-xl text-muted-foreground">Everything you need to run an autonomous AI business consultant</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {features.map((f, i) => (
                    <div key={i} className="bg-background border border-border p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                        <div className="h-12 w-12 bg-primary/10 flex items-center justify-center rounded-xl mb-6">
                            {f.icon}
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-3">{f.title}</h3>
                        <p className="text-muted-foreground leading-relaxed">{f.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
