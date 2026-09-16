-- Message kinds added for followed lines and the desk's morning digest.
alter type notify_kind add value if not exists 'watch';
alter type notify_kind add value if not exists 'digest';
