import os
import json
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt
from cryptography.exceptions import InvalidTag


KEY_SIZE = 32

SALT_SIZE = 16
NONCE_SIZE = 12

SCRYPT_N = 2**14
SCRYPT_R = 8
SCRYPT_P = 1


def derive_key(password: str, salt: bytes) -> bytes:
    kdf = Scrypt(
        salt=salt,
        length=KEY_SIZE,
        n=SCRYPT_N,
        r=SCRYPT_R,
        p=SCRYPT_P,
    )

    return kdf.derive(password.encode("utf-8"))

# ========================================== 
# Note encryption 
# ==========================================
def encrypt_note(key, title, content):

    note_data = {
        "title": title,
        "content": content
    }

    json_data = json.dumps(note_data)
    plaintext = json_data.encode("utf-8")

    return encrypt_data(key, plaintext)


# ========================================== 
# Note decryption 
# ==========================================
def decrypt_note(key: bytes, nonce: bytes, encrypted_data: bytes) -> str:

    plaintext = decrypt_data( 
        key, 
        nonce,
        encrypted_data 
    )

    json_data = plaintext.decode("utf-8")

    note_data = json.loads(json_data)

    return note_data


# ========================================== 
# Generic encryption
# ==========================================
def encrypt_data(key, data: bytes):
    nonce = os.urandom(NONCE_SIZE)

    aes = AESGCM(key)

    encrypted_data = aes.encrypt(
        nonce,
        data,
        None
    )

    return nonce, encrypted_data


# ========================================== 
# Generic decryption
# ==========================================
def decrypt_data(key, nonce, encrypted_data):
    aes = AESGCM(key)

    try: 
        plaintext = aes.decrypt( 
            nonce, 
            encrypted_data, 
            None 
        ) 

    except InvalidTag: 
        raise ValueError( "Wrong password or corrupted data." ) 
    
    return plaintext