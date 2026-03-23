const BARE_HOSTNAMES = new Set(["localhost", "sdelka.ai"]);

/**
 * Parses subdomain from window.location.hostname.
 * acme.sdelka.ai → "acme", acme.localhost → "acme", localhost → null
 */
export function getTenant(): string | null {
	const hostname = window.location.hostname;

	// IP addresses and bare hostnames have no subdomain
	if (BARE_HOSTNAMES.has(hostname) || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
		return null;
	}

	const dotIndex = hostname.indexOf(".");
	if (dotIndex === -1) return null;

	return hostname.slice(0, dotIndex);
}
