Preliminary! -- Basic code working with error restart, needs lots of cleanup and work for multiple subscriptons.  The code is not the same as used to generate the trace at bottom.  The test part is more automated now and just uses console.logs and a timed loop to send updates (inserts/deletes coming).

NOTE:  This respository [supabase-live-table](https://github.com/openartmarket/supabase-live-table/blob/main/src/index.ts) by aslakhellesoy uses a slightly different approach to the problem and uses timestamps to insure integrity.  It is also a more complete working solution versus my more test scenarios discussed below.  The error handling/retries discussed here and my other Github discussion should work with that repository also as currently it does not implement retry on error and leaves that to the user.   

# Realtime2
In a Supabase Github Discussion [How to obtain reliable realtime updates in the real world](https://github.com/orgs/supabase/discussions/5641)
I show issues with Realtime losing connection and propose a solution to keep a copy of data from the database updated reliably in the face of errors.  The
biggest issue is not missing table changes while Realime is reconnecting AND not missing changes in the initial connection.  

I proposed loading initial data after the subscription had succeeded in connecting.  This is certainly better than loading the intial data before starting the subscription
process, but it turns out there is still a small window for missing changes.

This repository is about eliminating that hole and will show an example to deal with it in JS.

The diagrams below show the issues with loading initial data then subscribing and the issues with getting initial data after subscribing.
The 2nd diagram also hints at the solution of a queue to deal with the remaining gap.

![image](https://github.com/GaryAustin1/Realtime2/assets/54564956/539a9be0-628b-424d-a711-96ca0b8031bf)

In the 2nd case, all data changes are captured by realtime and sent to the client.  The issue is that there is no initial data to update between getting subscribed and getting the inital data.   By including a queue to capture these request as part of the payload event handler, the original update code from "reliable updates in the real world) can be used.

Example Captures (tests not in the current code):
These show the yellow event path.  
1.

![image](https://github.com/GaryAustin1/Realtime2/assets/54564956/13c2c135-4b70-4293-9c12-eafd0729d6f2)  

2.
![missing events](https://github.com/GaryAustin1/Realtime2/assets/54564956/7c7d7860-8cee-4bca-9e67-51aac0d56acc)  

3.

![image](https://github.com/GaryAustin1/Realtime2/assets/54564956/cb42a131-2b15-400c-b9e1-ff05276bb547)


Note.  Need to edit below as the two yellows are actually green events.  Must have been late.  Will update with yellow event.
![](https://github.com/GaryAustin1/Realtime2/blob/4f5a19444a90fd07ac3f74c66566ef18bc23f166/DataRuns.drawio.png)


Note: I purposely moved API update calls around and in the event handler to increase chances of finding all the different cases occuring.  This testing method is really not the best, or easily documented, but the idea is to cause database updates to occur all around the subscription and initial database table load.
