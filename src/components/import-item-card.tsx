import type { NewItemInput } from "@/data/types";
import {
	DELIVERY_TYPE_LABELS,
	FREQUENCY_PERIOD_LABELS,
	PAYMENT_METHOD_LABELS,
	PAYMENT_TYPE_LABELS,
	PRICE_MONITORING_PERIOD_LABELS,
	UNLOADING_LABELS,
} from "@/data/types";
import { formatCurrency } from "@/lib/format";

interface ImportItemCardProps {
	item: NewItemInput;
	index: number;
}

function Field({ label, value }: { label: string; value: string | number }) {
	return (
		<div>
			<dt className="text-xs text-muted-foreground">{label}</dt>
			<dd className="text-sm">{value}</dd>
		</div>
	);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="border-t border-border pt-2">
			<p className="mb-1 text-xs font-medium text-muted-foreground">{title}</p>
			<dl className="grid grid-cols-2 gap-x-4 gap-y-1">{children}</dl>
		</div>
	);
}

export function ImportItemCard({ item, index }: ImportItemCardProps) {
	const hasBasicInfo = item.annualQuantity != null || item.unit != null || item.currentPrice != null;
	const hasFrequency = item.frequencyCount != null && item.frequencyPeriod != null;
	const hasPayment = item.paymentType != null || item.paymentMethod != null;
	const hasAnalogues = item.analoguesAllowed != null;

	return (
		<article className="rounded-lg border bg-background p-4">
			<div className="flex items-start gap-2">
				<span className="text-xs text-muted-foreground tabular-nums">{index + 1}</span>
				<div className="min-w-0 flex-1">
					<p className="text-sm font-medium">{item.name}</p>
					{item.description && <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>}
				</div>
			</div>

			<div className="mt-3 flex flex-col gap-2">
				{(hasBasicInfo || hasFrequency) && (
					<dl className="grid grid-cols-2 gap-x-4 gap-y-1">
						{item.annualQuantity != null && <Field label="Количество" value={item.annualQuantity} />}
						{item.unit != null && <Field label="Ед. измерения" value={item.unit} />}
						{item.currentPrice != null && <Field label="Цена" value={formatCurrency(item.currentPrice)} />}
						{hasFrequency && (
							<Field
								label="Частота закупок"
								value={`${item.frequencyCount} раз / ${item.frequencyPeriod ? FREQUENCY_PERIOD_LABELS[item.frequencyPeriod] : ""}`}
							/>
						)}
					</dl>
				)}

				{item.hideCompanyInfo && (
					<Section title="Компания">
						<Field label="Видимость" value="Информация скрыта" />
					</Section>
				)}

				{hasPayment && (
					<Section title="Оплата">
						{item.paymentType != null && <Field label="Тип оплаты" value={PAYMENT_TYPE_LABELS[item.paymentType]} />}
						{item.paymentType === "deferred" && item.paymentDeferralDays != null && (
							<Field label="Отсрочка (дн.)" value={item.paymentDeferralDays} />
						)}
						{item.paymentMethod != null && (
							<Field label="Способ оплаты" value={PAYMENT_METHOD_LABELS[item.paymentMethod]} />
						)}
					</Section>
				)}

				{item.deliveryType != null && (
					<Section title="Доставка">
						<Field label="Тип доставки" value={DELIVERY_TYPE_LABELS[item.deliveryType]} />
						{item.deliveryType === "warehouse" && item.deliveryAddress && (
							<Field label="Адрес" value={item.deliveryAddress} />
						)}
					</Section>
				)}

				{item.unloading != null && (
					<Section title="Разгрузка">
						<Field label="Тип" value={UNLOADING_LABELS[item.unloading]} />
					</Section>
				)}

				{hasAnalogues && (
					<Section title="Аналоги">
						<Field label="Допустимость" value={item.analoguesAllowed ? "Допускаются" : "Не допускаются"} />
					</Section>
				)}

				{item.additionalInfo && (
					<Section title="Дополнительная информация">
						<div className="col-span-2">
							<p className="text-sm">{item.additionalInfo}</p>
						</div>
					</Section>
				)}

				{item.priceMonitoringPeriod != null && (
					<Section title="Мониторинг цен">
						<Field label="Периодичность" value={PRICE_MONITORING_PERIOD_LABELS[item.priceMonitoringPeriod]} />
					</Section>
				)}
			</div>
		</article>
	);
}
