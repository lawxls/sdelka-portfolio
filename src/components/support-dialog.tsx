import { useState } from "react";
import { toast } from "sonner";
import { ChatComposer } from "@/components/chat-composer";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MESSENGERS = [
	{ name: "MAX", url: "https://max.ru/supdex", icon: "/messenger-max.png" },
	{ name: "WhatsApp", url: "https://wa.me/79999999999", icon: "/messenger-whatsapp.png" },
	{ name: "Telegram", url: "https://t.me/supdex", icon: "/messenger-telegram.png" },
] as const;

interface SupportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function SupportDialog({ open, onOpenChange }: SupportDialogProps) {
	const [pending, setPending] = useState(false);

	async function handleSend() {
		setPending(true);
		try {
			await new Promise<void>((resolve) => setTimeout(resolve, 400));
			toast.success("Сообщение отправлено");
			onOpenChange(false);
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[28rem]">
				<DialogHeader className="gap-3 pr-8">
					<DialogTitle>Поддержка</DialogTitle>
					<DialogDescription>
						Опишите вопрос или проблему&nbsp;— мы&nbsp;свяжемся с&nbsp;вами в&nbsp;ближайшее время.
					</DialogDescription>
				</DialogHeader>

				<ChatComposer onSend={handleSend} isPending={pending} />

				<div className="flex flex-col gap-3 border-t border-border pt-4">
					<p className="text-xs text-muted-foreground text-pretty">
						Или&nbsp;свяжитесь с&nbsp;нами в&nbsp;одном из&nbsp;мессенджеров
					</p>
					<ul className="flex items-center gap-3" aria-label="Мессенджеры поддержки">
						{MESSENGERS.map((messenger) => (
							<li key={messenger.name}>
								<a
									href={messenger.url}
									target="_blank"
									rel="noopener noreferrer"
									aria-label={messenger.name}
									className="block rounded-xl transition-[opacity,scale] duration-150 ease-out hover:opacity-80 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:active:scale-100"
								>
									<img
										src={messenger.icon}
										alt=""
										width={40}
										height={40}
										className="size-10 shrink-0 rounded-xl ring-1 ring-black/10 dark:ring-white/10"
									/>
								</a>
							</li>
						))}
					</ul>
				</div>
			</DialogContent>
		</Dialog>
	);
}
