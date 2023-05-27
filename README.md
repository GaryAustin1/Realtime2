Preliminary! -- Just problem statement so far.  Code seems to be working, but not ready to post yet.
# Realtime2
In a Supabase Github Discussion [How to obtain reliable realtime updates in the real world](https://github.com/orgs/supabase/discussions/5641)
I show issues with Realtime losing connection and propose a solution to keep a copy of data from the database updated reliably in the face of errors.  The
biggest issue is not missing table changes while Realime is reconnecting AND not missing changes in the initial connection.  

I proposed loading initial data after the subscription had succeeded in connecting.  This is certainly better than loading the intial data before starting the subscription
process, but it turns out there is still a small window for missing changes.

This repository is about eliminating that hole and will show an example to deal with it in JS.

The diagrams below show the issues with loading initial data then subscribing and the issues with getting initial data after subscribing.
The 2nd diagram also hints at the solution of a queue to deal with the remaining gap.

![](https://github.com/GaryAustin1/Realtime2/blob/4f5a19444a90fd07ac3f74c66566ef18bc23f166/RealtimeFlow.drawio.png)

In the 2nd case, all data changes are captured by realtime and sent to the client.  The issue is that there is no initial data to update between getting subscribed and getting the inital data.   By including a queue to capture these request as part of the payload event handler, the original update code from "reliable updates in the real world) can be used.

Example Captures:

![](https://github.com/GaryAustin1/Realtime2/blob/4f5a19444a90fd07ac3f74c66566ef18bc23f166/DataRuns.drawio.png)

Note: I purposely moved API update calls around and in the event handler to increase chances of finding all the different cases occuring.  This testing method is really not the best, or easily documented, but the idea it cause database updates to occur all around the subscription and initial database table load.
