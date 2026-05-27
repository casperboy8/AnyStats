# SMB Video-opslag — Installatiegids

AnyStats slaat geüploade video's op via het SMB-protocol rechtstreeks op een Windows Server share.
Hiervoor wordt de npm-package [`@marsaud/smb2`](https://github.com/marsaud/smb2) gebruikt
— geen `net use`-mount nodig.

---

## Vereisten

| Component | Versie |
|-----------|--------|
| Windows Server | 2012 R2 of hoger (SMB 2.0+) |
| Share-permissies | Lezen + Schrijven voor het service-account |
| Node.js (app-server) | 18+ |

---

## Stap 1 — Share aanmaken op de server

1. Open **Server Manager → File and Storage Services → Shares**.
2. Maak een nieuwe share aan, bijv. `AnyStats`.
3. Geef het service-account (`anystats@caspervanunen.local`) **Lezen en Schrijven**-rechten.
4. Zorg dat de NTFS-rechten ook kloppen (Security tab op de map).

---

## Stap 2 — Omgevingsvariabelen instellen

Voeg de volgende regels toe aan `.env.local` (nooit in `.env.example` met echte waarden):

```env
SMB_HOST=CUSVDC1              # hostname of IP van de Windows Server
SMB_SHARE=AnyStats            # naam van de share (zonder backslashes)
SMB_USERNAME=anystats@caspervanunen.local
SMB_PASSWORD=<wachtwoord>
SMB_DOMAIN=caspervanunen.local
```

> **Let op:** `.env.local` staat in `.gitignore` en wordt nooit gecommit.

---

## Stap 3 — Testen

Start de app lokaal en upload een video via het dashboard.
Controleer daarna of het bestand zichtbaar is op `\\CUSVDC1\AnyStats\<orgId>\<userId>\`.

---

## Mappenstructuur op de share

```
\\CUSVDC1\AnyStats\
  └── <organisation_id>\
        └── <user_id>\
              └── <timestamp>-<originalfilename>.mp4
```

---

## Productie — Linux-appserver met Windows Server share

Als de Next.js-app op een Linux-server draait, zijn er twee opties:

### Optie A — Directe SMB via @marsaud/smb2 (aanbevolen, geen mount)

Geen extra configuratie nodig; de app gebruikt TCP-SMB rechtstreeks.
Zorg alleen dat poort 445 open is tussen de app-server en de Windows Server.

### Optie B — Mount via CIFS (alternatief)

```bash
# Ubuntu / Debian
sudo apt install cifs-utils

# Maak een credentials-bestand
sudo nano /etc/samba/anystats-creds
# Inhoud:
#   username=anystats
#   password=<wachtwoord>
#   domain=caspervanunen.local
sudo chmod 600 /etc/samba/anystats-creds

# Mountpunt aanmaken
sudo mkdir -p /mnt/anystats

# Eenmalig mounten
sudo mount -t cifs //CUSVDC1/AnyStats /mnt/anystats \
  -o credentials=/etc/samba/anystats-creds,vers=2.0,uid=$(id -u nodeuser),gid=$(id -g nodeuser)

# Permanent via /etc/fstab:
//CUSVDC1/AnyStats /mnt/anystats cifs credentials=/etc/samba/anystats-creds,vers=2.0,uid=1001,gid=1001,_netdev 0 0
```

Stel dan `UPLOAD_DIR=/mnt/anystats` in `.env.local` en gebruik de bestaande
bestandssysteem-upload-code (niet de SMB-lib).

---

## Probleemoplossing

| Probleem | Oplossing |
|----------|-----------|
| `ECONNREFUSED` of timeout | Controleer firewall — poort 445 moet open zijn |
| `NT_STATUS_LOGON_FAILURE` | Controleer gebruikersnaam/wachtwoord/domein |
| `NT_STATUS_ACCESS_DENIED` | Controleer share- én NTFS-permissies |
| `NT_STATUS_OBJECT_NAME_NOT_FOUND` | Map bestaat niet — de code maakt mappen automatisch aan |
| Grote video's zijn traag | `@marsaud/smb2` laadt het hele bestand in RAM voor range-reads; overweeg Optie B (CIFS-mount) voor betere streaming |
