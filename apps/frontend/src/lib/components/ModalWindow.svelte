<script lang="ts">
import type { Snippet } from "svelte";
import { cubicOut } from "svelte/easing";
import { fade, scale } from "svelte/transition";

type Props = {
	children?: Snippet;
	header?: Snippet;
	title?: string;
	class?: string;
	open?: boolean;
	showOverlay?: boolean;
	closeOnBackdrop?: boolean;
	closeOnEscape?: boolean;
	showCloseButton?: boolean;
	closeLabel?: string;
	onClose?: (() => void) | undefined;
};

let {
	children,
	header,
	title = "",
	class: className = "",
	open = true,
	showOverlay = false,
	closeOnBackdrop = true,
	closeOnEscape = true,
	showCloseButton = true,
	closeLabel = "閉じる",
	onClose,
}: Props = $props();
</script>

<svelte:window
	onkeydown={(event) => {
		if (!open || !closeOnEscape) return;
		if (event.key === "Escape") {
			event.preventDefault();
			onClose?.();
		}
	}}
/>

{#if open}
	<div class={`modal-root ${showOverlay ? "is-overlay" : ""}`}>
		{#if showOverlay}
			<button
				type="button"
				class="modal-backdrop"
				aria-label={closeLabel}
				in:fade={{ duration: 180 }}
				out:fade={{ duration: 140 }}
				onclick={() => {
					if (!closeOnBackdrop) return;
					onClose?.();
				}}
			></button>
		{/if}

		<div
			class={`modal-window ${className}`}
			role="dialog"
			aria-modal="true"
			aria-label={title || closeLabel}
			in:scale={{ start: 0.92, duration: 200, easing: cubicOut }}
			out:scale={{ start: 0.92, duration: 150 }}
		>
			<div class="modal-header">
				<div class="modal-heading">
					{#if header}
						{@render header()}
					{:else if title}
						<p class="title">{title}</p>
					{/if}
				</div>
				{#if showCloseButton}
					<button type="button" class="modal-close" aria-label={closeLabel} onclick={() => onClose?.()}>
						×
					</button>
				{/if}
			</div>

			<div class="modal-body">{@render children?.()}</div>
		</div>
	</div>
{/if}

<style lang="scss">
	.modal-root {
		position: relative;
	}

	.modal-root.is-overlay {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		z-index: 50;
		padding: 1rem;
	}

	.modal-backdrop {
		position: absolute;
		inset: 0;
		border: 0;
		background: rgb(0 0 0 / 46%);
		backdrop-filter: blur(1.5px);
		cursor: default;
	}

	.modal-window {
		position: relative;
		width: min(92vw, 360px);
		outline-offset: -1pt;
		outline: solid 1pt #ffffff80;
		box-shadow: 0 0 0 0.5pt #00000040;
		border-radius: 1rem;
		background: rgb(244 244 245 / 95%);
		// box-shadow: var(--shadow-elevation-high);
		backdrop-filter: blur(4px);
		padding: 1.5rem;

		@media (min-width: 640px) {
			padding: 1.75rem;
		}
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		color: rgb(82 82 91);
	}

	.modal-heading {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.title {
		font-size: 1rem;
		font-weight: 900;
	}

	.modal-close {
		border: 0;
		background: transparent;
		font-size: 1.25rem;
		line-height: 1;
		color: rgb(82 82 91);
		cursor: pointer;
		transition: color 150ms ease;

		&:hover {
			color: rgb(24 24 27);
		}
	}

	.modal-body {
		margin-top: 1rem;
	}
</style>
