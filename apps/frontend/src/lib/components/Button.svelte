<script lang="ts">
import type { Snippet } from "svelte";

type ButtonVariant = "primary" | "strong" | "normal" | "warning" | "danger";
type ButtonType = "button" | "submit" | "reset";

type Props = {
	children?: Snippet;
	variant?: ButtonVariant;
	type?: ButtonType;
	disabled?: boolean;
	rounded?: boolean;
	class?: string;
	onClick?: ((event: MouseEvent) => void) | undefined;
	[key: string]: unknown;
};

let {
	children,
	variant = "normal",
	type = "button",
	disabled = false,
	rounded = false,
	class: className = "",
	onClick,
	...restProps
}: Props = $props();

const variantClass: Record<ButtonVariant, string> = {
	primary: "primary",
	normal: "normal",
	danger: "danger",
	strong: "strong",
	warning: "warning",
};
</script>

<button
	{type}
	{disabled}
	onclick={onClick}
	class={`action-button ${variantClass[variant]} ${rounded ? "rounded" : ""} ${className}`}
	{...restProps}
>
	{@render children?.()}
</button>

<style lang="scss">
$focus-ring: rgb(255 255 255 / 75%);
$primary-color: #96f400;

.action-button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border: 1px solid transparent;
	border-radius: 0.5rem;
	padding: 0.5rem 1rem;
	font-size: 0.9rem;
	line-height: 1;
	cursor: pointer;
	gap: 0.25rem;
	outline-offset: -1pt;
	outline: solid 1pt #ffffff80;
	box-shadow: 0 0 1pt #00000040;
	transition: all 150ms ease;

	&:focus-visible {
		outline: solid 2px $focus-ring;
		outline-offset: 2px;
	}

	&:disabled {
		cursor: not-allowed;
		opacity: 0.45;
	}

	&:hover:not(:disabled) {
		filter: brightness(1.05);
	}

	&.rounded {
		border-radius: 9999px;
	}

	&.primary {
		background-color: $primary-color;
		color: #192500;
		font-weight: 500;
	}

	&.normal {
		border-color: #29383d;
		background-color: #1a2529;
		color: #d2d8da;
		outline-offset: -1pt;
		outline: solid 0.5pt #ffffff20;
		box-shadow: 0 0 1pt #00000080;
	}

	&.danger {
		border-color: #ff3c3c;
		background-color: #ff3c3c;
		color: #ffffff;
	}

	&.strong {
		background: linear-gradient(0.1turn, $primary-color, #32f4b0);
		color: #192500;
		font-weight: bold;

		&:hover:not(:disabled) {
			border-color: #cdff30;
		}
	}

	&.warning {
		border-color: #ff9f00;
		background-color: #ff9f00;
		color: #192500;
	}
}
</style>
