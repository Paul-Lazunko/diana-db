#Diana Database

Diana DB is column oriented schema controlled NoSQL database. 

It is Open Source and free.

It is written with Typescript (compiled to Javascript) and can run as a Node.js app (as a standalone Node.js project or a Docker container based on an existing Docker image).
There is no restrictions how many servers You can start at one machine - You can run so many as You want and so many as resources of Your machine allow.


«Column oriented» means that each inserted document will be destructured and its states will be stored separately like primitive values in the specific data structures.
In a sense, all of these properties work like indexes, allowing You to quickly insert, update, and find documents.


«Schema controlled» means that there are specific, strict rules that guarantee the integrity and consistency of data.


In general, DianaDB provides the following capabilities:

- **Security** - client and server interact with encrypted frames and there is no key exchange during connection. You cannot receive or modify data without a valid security key.
- **Speed** - DianaDb is fast and designed for high loads.
- **Stability** - DianaDb saves data in the background and restores it after server restart.
- **Special Types** - there are special types, such as the TIME column type, which make it easy, for example, to find documents related to all Mondays of April and June 2020, or the POSITION column type, which stores position in some coordinate system and makes it easy to find documents, position which is inside / outside the circle / polygon, or within the specified distance from the specified path.
- **Migrations** -DianaDB supports migrations out of the box and You don't need to use external solutions.
- **Transactions** - DianaDB provides non-blocking transactions
- **Multiple sorting** - You can sort the found documents by multiple fields.
- **Transform Queries** - which allow You to modify found documents as You see fit, like MongoDB aggregation.

Also we will provide more features and capabilities after β testing and hope that Your use of the DianaDB will be pleasant and useful

Documentation and API: https://diana-db.com
