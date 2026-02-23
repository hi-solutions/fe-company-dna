import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import Link from "next/link";

export default function PricingPage() {
    const plans = [
        {
            name: "Solo",
            price: "$49",
            description: "Perfect for independent consultants",
            features: [
                "1 workspace admin",
                "2 employees",
                "2 GB DNA storage",
                "1M tokens/month",
                "Standard support"
            ],
            popular: false
        },
        {
            name: "Team",
            price: "$149",
            description: "Great for small businesses and teams",
            features: [
                "1 admin",
                "10 employees",
                "10 GB DNA storage",
                "5M tokens/month",
                "Priority support",
                "Custom templates"
            ],
            popular: true
        },
        {
            name: "Corporate",
            price: "$499",
            description: "For large organizations with massive DNA",
            features: [
                "3 admins",
                "50 employees",
                "100 GB DNA storage",
                "20M tokens/month",
                "24/7 dedicated support",
                "Self-hosted AI options"
            ],
            popular: false
        }
    ];

    return (
        <div className="py-20 px-4 md:px-8 max-w-6xl mx-auto">
            <div className="text-center mb-16">
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Simple, Transparent Pricing</h1>
                <p className="mt-4 text-xl text-muted-foreground">Choose the plan that fits your company&apos;s scale</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-24">
                {plans.map((plan, i) => (
                    <div key={i} className={`relative flex flex-col bg-background border p-8 rounded-2xl shadow-sm ${plan.popular ? 'border-blue-500 ring-1 ring-blue-500 shadow-md transform md:-translate-y-2' : 'border-border'}`}>
                        {plan.popular && (
                            <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-foreground text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">
                                Most Popular
                            </span>
                        )}
                        <h3 className="text-2xl font-semibold text-foreground">{plan.name}</h3>
                        <p className="mt-2 text-muted-foreground">{plan.description}</p>
                        <div className="my-6">
                            <span className="text-4xl font-extrabold text-foreground">{plan.price}</span>
                            <span className="text-muted-foreground">/mo</span>
                        </div>
                        <Link href="/register" className="mt-auto mb-8">
                            <Button className="w-full" variant={plan.popular ? "default" : "outline"} size="lg">
                                Get Started
                            </Button>
                        </Link>
                        <ul className="space-y-4">
                            {plan.features.map((feature, idx) => (
                                <li key={idx} className="flex items-center text-foreground">
                                    <Check className="h-5 w-5 text-primary mr-3 flex-shrink-0" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
                <div className="space-y-6">
                    <div className="bg-background p-6 rounded-xl border border-border">
                        <h4 className="font-semibold text-lg mb-2">Can I self-host the AI models?</h4>
                        <p className="text-muted-foreground">Yes, our Corporate plan offers integration with self-hosted instances of Llama 3 or custom fine-tuned models on your infrastructure to ensure 100% data privacy.</p>
                    </div>
                    <div className="bg-background p-6 rounded-xl border border-border">
                        <h4 className="font-semibold text-lg mb-2">What happens when I exceed my token limit?</h4>
                        <p className="text-muted-foreground">We will notify you when you reach 80% and 100% of your usage limit. You can easily upgrade your plan or purchase an overage add-on for the remainder of the month.</p>
                    </div>
                    <div className="bg-background p-6 rounded-xl border border-border">
                        <h4 className="font-semibold text-lg mb-2">Is my company DNA secure?</h4>
                        <p className="text-muted-foreground">Absolutely. We enforce strict multi-tenancy. Your data vectors are isolated from other companies and are never used to train our base AI models.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
