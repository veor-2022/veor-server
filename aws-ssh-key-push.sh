# aws ec2-instance-connect send-ssh-public-key \
#     --region us-west-2 \
#     --availability-zone us-west-2b \
#     --instance-id i-001234a4bf70dec41EXAMPLE \
#     --instance-os-user ec2-user \
#     --ssh-public-key file://my_key.pub
chmod 0400 veor-test.pem
ssh -i veor-test.pem admin@18.188.61.35
ssh -i "veor-test.pem" admin@ec2-18-117-82-83.us-east-2.compute.amazonaws.com

3 check remote log in is active #SSH troubleshooting :

sudo systemsetup -getremotelogin
sudo launchctl list | grep ssh
# stop it
sudo launchctl unload /System/Library/LaunchDaemons/ssh.plist
# start it
sudo launchctl load -w /System/Library/LaunchDaemons/ssh.plist

sudo launchctl stop com.openssh.sshd

sudo launchctl start com.openssh.sshd
