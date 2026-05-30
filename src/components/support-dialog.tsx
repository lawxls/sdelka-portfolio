import { toast } from "sonner";
import { ChatComposer } from "@/components/chat-composer";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TooManyRequestsError } from "@/data/errors";
import { useSendSupportMessage } from "@/data/use-support";
import { pluralizeRu } from "@/lib/format";

const MESSENGERS = [
	{ name: "WhatsApp", url: "https://wa.me/message/K6I2YVKDY4XGH1", icon: "/messenger-whatsapp.png" },
	{ name: "Telegram", url: "https://t.me/SdelkaAI", icon: "/messenger-telegram.png" },
] as const;

// Support tickets commonly carry a screenshot, so allow images alongside the
// document types the composer accepts by default.
const SUPPORT_EXTENSIONS = [
	".pdf",
	".xlsx",
	".xls",
	".doc",
	".docx",
	".csv",
	".png",
	".jpg",
	".jpeg",
	".gif",
	".webp",
	".heic",
	".heif",
] as const;

interface SupportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function supportErrorMessage(err: unknown): string {
	if (err instanceof TooManyRequestsError) {
		const seconds = err.retryAfter;
		const suffix =
			seconds && seconds > 0
				? ` Повторите попытку через ${pluralizeRu(seconds, "секунду", "секунды", "секунд")}.`
				: " Попробуйте позже.";
		return `Слишком много обращений в поддержку.${suffix}`;
	}
	return "Не удалось отправить сообщение. Попробуйте ещё раз.";
}

/** Mounted only while the dialog is open (radix unmounts `DialogContent` on
 * close), so the mutation state resets between sessions without an effect. */
function SupportForm({ onSent }: { onSent: () => void }) {
	const sendMessage = useSendSupportMessage();

	async function handleSend(message: string, files: File[]) {
		await sendMessage.mutateAsync({ message, attachments: files });
		toast.success("Сообщение отправлено");
		onSent();
	}

	return (
		<ChatComposer
			onSend={handleSend}
			isPending={sendMessage.isPending}
			error={sendMessage.error ? supportErrorMessage(sendMessage.error) : null}
			requireBody
			allowedExtensions={SUPPORT_EXTENSIONS}
		/>
	);
}

export function SupportDialog({ open, onOpenChange }: SupportDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[28rem]">
				<DialogHeader className="gap-3 pr-8">
					<DialogTitle>Поддержка</DialogTitle>
					<DialogDescription className="text-pretty">
						Опишите вопрос или проблему&nbsp;— мы&nbsp;свяжемся с&nbsp;вами в&nbsp;ближайшее время.
					</DialogDescription>
				</DialogHeader>

				<SupportForm onSent={() => onOpenChange(false)} />

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
