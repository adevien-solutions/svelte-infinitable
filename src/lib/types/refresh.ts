export type LastRefreshDetail = {
	/** A date object representing the last refresh. */
	refreshedAt: Date;
	/**
	 * The auto-updating formatted relative time since the last refresh.
	 */
	value: string;
	/** Stops the ticking of the auto-updating value. */
	cancel: () => void;
};

export type RefreshLabelUpdateTickRate = 'second' | 'minute';
