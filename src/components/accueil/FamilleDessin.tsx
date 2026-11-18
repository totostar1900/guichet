/**
 * LE DESSIN DE LA FAMILLE, QUI SE TRACE (18 novembre 2026, le client : « le dessin en pièce jointe, sans fond, juste les contours qui se dessinent progressivement »).
 *
 * Un cœur qui enlace deux adultes et un enfant, à l'encre de la page : aucun fond, rien que des traits. Les lignes viennent du dessin d'origine, ramenées à leur ligne centrale (trois têtes en cercles exacts, le cœur, les bras, le buste) et se tracent dans l'ordre : le cœur d'abord, puis les têtes, puis le buste.
 * Chaque trait déclare « pathLength=1 » et « data-trait » : le tracé est une animation de « stroke-dashoffset » (voir « Accueil.module.css »), lancée par « TraceSurVue » quand le dessin entre dans l'écran. Sans script ou avec « moins de mouvement », le dessin est entier, d'emblée.
 */
export function FamilleDessin({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="96 96 362 362" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M259 238C260 236 264 228 268 225C272 222 276 221 281 220C286 219 288 218 296 220C304 222 321 230 330 232C339 234 336 236 348 235C360 234 388 229 399 229C410 229 412 232 416 235C420 238 422 240 426 244C430 248 434 255 437 261C440 267 440 274 441 280C442 286 441 292 440 298C439 304 438 308 435 314C432 320 430 325 425 332C420 339 416 345 404 356C392 367 362 389 351 397C340 405 341 400 337 402C333 404 332 409 329 412C326 415 321 418 318 419C315 420 311 420 309 421C307 422 311 423 306 427C301 431 287 440 281 443C275 446 272 446 268 447C264 448 261 448 256 446C251 444 243 438 238 434C233 430 229 427 227 424C225 421 226 418 224 417C222 416 219 417 216 415C213 413 209 410 206 407C203 404 201 397 198 394C195 391 197 399 188 391C179 383 153 358 143 347C133 336 132 334 128 326C124 318 120 309 117 302C114 295 113 290 112 283C111 276 111 265 112 258C113 251 114 246 117 240C120 234 123 228 127 223C131 218 136 213 141 210C146 207 151 204 157 203C163 202 172 201 179 202C186 203 196 206 202 207C208 208 212 209 218 206C224 203 234 194 241 191C248 188 252 186 259 185C266 184 277 186 283 187C289 188 292 190 295 192C298 194 302 198 303 199" pathLength="1" data-trait="" style={{ ["--d" as string]: "0s" }} />
      <path d="M394 305C391 309 385 319 376 329C367 339 347 357 340 363C333 369 335 365 333 365C331 365 331 366 329 362C327 358 322 346 320 342C318 338 317 338 314 336C311 334 311 332 303 332C295 332 280 338 268 338C256 338 240 332 232 332C224 332 225 334 221 336C217 338 212 344 209 346C206 348 208 350 202 345C196 340 182 327 176 319C170 311 168 302 166 295C164 288 164 279 163 276" pathLength="1" data-trait="" style={{ ["--d" as string]: "1.4s" }} />
      <path d="M200 391C200 389 199 387 200 380C201 373 206 354 207 349" pathLength="1" data-trait="" style={{ ["--d" as string]: "1.9s" }} />
      <path d="M229 387L226 414" pathLength="1" data-trait="" style={{ ["--d" as string]: "2.1s" }} />
      <path d="M332 368L335 399" pathLength="1" data-trait="" style={{ ["--d" as string]: "1.9s" }} />
      <path d="M307 418L304 388" pathLength="1" data-trait="" style={{ ["--d" as string]: "2.1s" }} />
      <circle cx="201" cy="143" r="37" pathLength="1" transform="rotate(-90 201 143)" data-trait="" style={{ ["--d" as string]: "0.5s" }} />
      <circle cx="353" cy="177" r="36" pathLength="1" transform="rotate(-90 353 177)" data-trait="" style={{ ["--d" as string]: "0.9s" }} />
      <circle cx="267" cy="291" r="31" pathLength="1" transform="rotate(-90 267 291)" data-trait="" style={{ ["--d" as string]: "1.4s" }} />
    </svg>
  );
}
