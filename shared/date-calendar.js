const dateSelector = 'input[type="date"], input[data-calendar-date]';
let calendarId = 0;

function todayISO() {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map(({ type, value }) => [type, value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
}

export function positionDateCalendar(instance, element = instance._positionElement) {
    if (!element?.isConnected) return;
    const calendar = instance.calendarContainer;
    const rect = element.getBoundingClientRect();
    const margin = 12;
    const below = rect.bottom + 8;
    const top = below + calendar.offsetHeight <= innerHeight - margin ? below : Math.max(margin, rect.top - calendar.offsetHeight - 8);
    Object.assign(calendar.style, { position: "fixed", top: `${top}px`, left: `${Math.max(margin, Math.min(rect.left, innerWidth - calendar.offsetWidth - margin))}px`, right: "auto" });
}

export function decorateDateCalendar(instance, actions = {}) {
    const calendar = instance.calendarContainer;
    calendar.classList.add("admin-date-calendar");
    calendar.id ||= `project-date-calendar-${++calendarId}`;
    calendar.setAttribute("role", "dialog");
    calendar.setAttribute("aria-label", "Select date");
    instance.prevMonthNav.setAttribute("aria-label", "Previous month");
    instance.nextMonthNav.setAttribute("aria-label", "Next month");
    [instance.prevMonthNav, instance.nextMonthNav].forEach((navigation) => { navigation.setAttribute("role", "button"); navigation.tabIndex = 0; });
    instance.currentYearElement.setAttribute("aria-label", "Year");
    const footer = document.createElement("div");
    footer.className = "admin-date-footer";
    const clear = document.createElement("button");
    clear.type = "button"; clear.textContent = "Clear"; clear.className = "admin-date-clear";
    clear.addEventListener("click", () => {
        if (actions.onClear) actions.onClear();
        else { instance.clear(true); instance.close(); }
    });
    const selectToday = document.createElement("button");
    selectToday.type = "button"; selectToday.textContent = "Today"; selectToday.className = "admin-date-today";
    selectToday.addEventListener("click", () => {
        if (actions.onToday) actions.onToday();
        else { instance.setDate(instance.config.mode === "range" ? [todayISO(), todayISO()] : todayISO(), true, "Y-m-d"); instance.close(); }
    });
    footer.append(clear, selectToday); calendar.append(footer);
    const keyboard = (event) => {
        const action = event.target instanceof Element ? event.target.closest(".admin-date-footer button, .flatpickr-prev-month, .flatpickr-next-month") : null;
        if (action && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); event.stopPropagation(); action.click(); }
        else if (event.key === "Tab" && event.shiftKey && event.target instanceof Element && event.target.matches(".flatpickr-day")) { event.preventDefault(); event.stopPropagation(); instance.currentYearElement.focus(); }
        else if (event.target === instance.monthsDropdownContainer && event.key !== "Escape") event.stopPropagation();
    };
    calendar.addEventListener("keydown", keyboard, true);
    instance.config.onDestroy.push(() => calendar.removeEventListener("keydown", keyboard, true));
}
function dateInputFor(target) {
    if (!(target instanceof Element))
        return null;
    if (target instanceof HTMLInputElement)
        return target.matches(dateSelector) ? target : null;
    // Labels already forward clicks to their inputs; other controls keep their own actions.
    if (target.closest("label, button, a, select, textarea, input"))
        return null;
    for (let container = target; container; container = container.parentElement) {
        const input = container.querySelector(':scope > input[type="date"], :scope > input[data-calendar-date], :scope > .calendar-date-wrapper > input[data-calendar-date]');
        if (input)
            return input;
    }
    return null;
}
export function installDateCalendarSupport(flatpickr) {
    // Use a separate anchor so Flatpickr never changes React's controlled inputs,
    // their ISO values, or the browser's required/min/max validation.
    const anchor = document.createElement("input");
    anchor.type = "text";
    anchor.tabIndex = -1;
    anchor.className = "admin-date-anchor";
    anchor.setAttribute("aria-hidden", "true");
    document.body.append(anchor);
    let active = null;
    let returnFocus = false;
    let focusFrame = 0;
    let savedAttributes = [];
    const today = todayISO;
    const update = (value) => {
        if (!active?.isConnected || active.readOnly || active.matches(":disabled"))
            return;
        const date = value ? picker.parseDate(value, "Y-m-d") : null;
        const formatted = date ? picker.formatDate(date, active.dataset.calendarFormat || "Y-m-d") : "";
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(active, formatted);
        active.dispatchEvent(new Event("input", { bubbles: true }));
        active.dispatchEvent(new Event("change", { bubbles: true }));
        returnFocus = true;
    };
    const picker = flatpickr(anchor, {
        dateFormat: "Y-m-d", ariaDateFormat: "F j, Y", disableMobile: true,
        allowInput: true, clickOpens: false, animate: false, monthSelectorType: "dropdown",
        position: (instance) => {
            if (!active?.isConnected)
                return;
            positionDateCalendar(instance, active);
        },
        onReady: (_, __, instance) => {
            decorateDateCalendar(instance, {
                onClear: () => { instance.clear(false); update(""); instance.close(); },
                onToday: () => { instance.setDate(today(), true); instance.close(); },
            });
            instance.calendarContainer.id = "admin-date-calendar";
        },
        onChange: (_, value) => update(value),
        onOpen: (_, __, instance) => {
            if (!active)
                return;
            savedAttributes = ["aria-haspopup", "aria-expanded", "aria-controls"].map((name) => [name, active?.getAttribute(name) ?? null]);
            active.setAttribute("aria-haspopup", "dialog");
            active.setAttribute("aria-expanded", "true");
            active.setAttribute("aria-controls", instance.calendarContainer.id);
            const label = active.labels?.[0]?.textContent?.trim() || active.getAttribute("aria-label") || "Select date";
            instance.calendarContainer.setAttribute("aria-label", `${label} calendar`);
            const todayButton = instance.calendarContainer.querySelector(".admin-date-today");
            if (todayButton)
                todayButton.disabled = !!(((active.min || active.dataset.calendarMin) && today() < (active.min || active.dataset.calendarMin)) || ((active.max || active.dataset.calendarMax) && today() > (active.max || active.dataset.calendarMax)));
            focusFrame = requestAnimationFrame(() => {
                if (!instance.isOpen)
                    return;
                const calendar = instance.calendarContainer;
                const day = calendar.querySelector(".selected") || calendar.querySelector(".today:not(.flatpickr-disabled)") || calendar.querySelector(".flatpickr-day:not(.flatpickr-disabled)");
                day?.focus({ preventScroll: true });
            });
        },
        onClose: () => {
            cancelAnimationFrame(focusFrame);
            if (active) {
                savedAttributes.forEach(([name, value]) => { if (value === null)
                    active?.removeAttribute(name);
                else
                    active?.setAttribute(name, value); });
                if (returnFocus && active.isConnected)
                    active.focus({ preventScroll: true });
            }
            savedAttributes = [];
            returnFocus = false;
        },
    });
    const open = (input) => {
        if (!input || input.readOnly || input.matches(":disabled"))
            return false;
        if (picker.isOpen && active === input)
            return true;
        picker.close();
        active = input;
        picker.config.ignoredFocusElements = [input.parentElement || input];
        picker.set({ minDate: input.min || input.dataset.calendarMin || undefined, maxDate: input.max || input.dataset.calendarMax || undefined });
        const value = input.hasAttribute("data-calendar-date") ? input.dataset.calendarValue : input.value;
        picker.setDate(value || [], false);
        picker.jumpToDate(value || today());
        input.focus({ preventScroll: true });
        picker.open();
        return true;
    };
    const click = (event) => {
        if (!event.defaultPrevented && open(dateInputFor(event.target)))
            event.preventDefault();
    };
    const keydown = (event) => {
        if (event.key === "Escape" && picker.isOpen) {
            returnFocus = true;
            picker.close();
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        if (picker.isOpen && event.target instanceof HTMLElement) {
            const action = event.target.closest(".admin-date-footer button, .flatpickr-prev-month, .flatpickr-next-month");
            if (action && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                event.stopPropagation();
                action.click();
                return;
            }
            if (event.key === "Tab" && event.shiftKey && event.target.matches(".flatpickr-day")) {
                event.preventDefault();
                event.stopPropagation();
                picker.currentYearElement.focus();
                return;
            }
            if (event.target === picker.monthsDropdownContainer)
                event.stopPropagation();
        }
        if (!event.defaultPrevented && (event.key === "F4" || event.key === " " || (event.altKey && event.key === "ArrowDown")) && event.target instanceof HTMLInputElement && event.target.matches(dateSelector) && open(event.target))
            event.preventDefault();
    };
    const dismiss = (event) => { if (!(event.target instanceof Node) || !picker.calendarContainer.contains(event.target))
        picker.close(); };
    const reposition = () => { if (picker.isOpen) positionDateCalendar(picker, active); };
    const observer = new MutationObserver(() => { if (picker.isOpen && (!active?.isConnected || active.readOnly || active.matches(":disabled")))
        picker.close(); });
    observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled", "readonly"] });
    document.addEventListener("click", click);
    document.addEventListener("keydown", keydown, true);
    document.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", reposition);
    return () => {
        picker.close();
        picker.destroy();
        anchor.remove();
        observer.disconnect();
        cancelAnimationFrame(focusFrame);
        document.removeEventListener("click", click);
        document.removeEventListener("keydown", keydown, true);
        document.removeEventListener("scroll", dismiss, true);
        window.removeEventListener("resize", reposition);
    };
}
