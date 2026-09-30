// Shared by the knowledge base list and article pages.

// Content is (sanitised) HTML; cards and search previews want plain text.
export const excerpt = (html = '', length = 150) => {
    const text = String(html).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;
};

// TAGS is one comma-separated column: "js, react ,  hooks" -> ["js", "react", "hooks"].
export const splitTags = (tags = '') => String(tags ?? '').split(',').map(tag => tag.trim()).filter(Boolean);
