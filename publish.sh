VERSION=$(node -e "x = `cat package.json`; console.log(x.version)")
git commit -a
git tag v${VERSION}
git push
git push origin v${VERSION}
apm publish -t v${VERSION}
