# Channel Participation

- System channel no longer required, Now you can create a channel without a system channel
- Consortium no longer required. all channels are application channels, so the concept of a list of organizations who can create channels no longer applies.
- Now as a compensation for Consortium missing, you do need to create at least one peer organization MSP definitions provided in the configtx.yaml 
- a system channel genesis block no longer needs to exist
- orderers can join or leave channels as needed,
- Easy to list the channels that the ordering node is a consenter on.
- Simple process to remove a channel and the blocks associated with that channel.

## Notes
- **Incompatible** with system channel mode

 
## Migration
- [How to migrate from a system channel equipped blockchain](https://hyperledger-fabric.readthedocs.io/en/release-2.3/create_channel/create_channel_participation.html#remove-the-system-channel)
 
 
## Reference
- https://hyperledger-fabric.readthedocs.io/en/release-2.3/create_channel/create_channel_participation.html 
