// get-user-groups returns one row per *other* member, so a 3-person group arrives twice.
// Fold the rows into one entry per group, titled by its name or else its members.
export const toGroups = (rows) => {
  const groups = new Map();
  (rows ?? []).forEach(row => {
    const group = groups.get(row.groupId)
      ?? {groupId: row.groupId, name: row.name, photo: row.photo, members: [], memberIds: [], participants: []};
    if (row.participantUsername) group.members.push(row.participantUsername);
    if (row.participantId) group.memberIds.push(row.participantId);
    // The people themselves, for the participants list; the two above are the title and the
    // lookups that were already built on them.
    if (row.participantId) {
      group.participants.push({id: row.participantId, username: row.participantUsername});
    }
    groups.set(row.groupId, group);
  });
  return Array.from(groups.values());
};

export const groupTitle = (group, fallback) => group?.name || group?.members.join(', ') || fallback;
