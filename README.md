# Realtime2
In a Supabase Github Discussion [How to obtain reliable realtime updates in the real world](https://github.com/orgs/supabase/discussions/5641)
I show issues with Realtime losing connection and propose a solution to keep a table from the database updated reliably in the face of errors.  The
biggest issue is not missing table changes while Realime is reconnecting AND not missing changes in the initial connection.  

I proposed loading initial data after the subscription had succeeded in connecting.  This is certainly better than loading the intial before starting the subscription
process, but it turns out there is still a small window for missing changes.

This repository is about eliminating that hole and will show an example to deal with it in JS.

The diagrams below show the issues with loading initial data then subscribing and the issues with getting initial data after subscribing.
The 2nd diagram also hints at the solution of a queue to deal with the remaining gap.

![](https://github.com/GaryAustin1/Realtime2/blob/19ebb3bb1c517d471fe40f4477057fff7245d707/RealtimeFlow.drawio.png)
