import logging
import rsa
import base64

def signSecret(message):
	with open('./keys/privkey.pem', mode='rb') as privatefile:
		keydata = privatefile.read()
	privkey = rsa.PrivateKey.load_pkcs1(keydata)
	signature = rsa.sign(message.encode(), privkey, 'SHA-256')
	signature_b64 = base64.encodebytes(signature).decode()
	return signature_b64

def verifySecret(message, signature_b64):
	with open('./keys/pubkey.pem', mode='rb') as privatefile:
		keydata = privatefile.read()
	pubkey = rsa.PublicKey.load_pkcs1(keydata)
	signature = base64.decodebytes(signature_b64.encode())
	try: 
		isVerified = rsa.verify(message.encode(), signature, pubkey)
		return True
	except VerificationError as e:
		logging.error(e)
		return False
	